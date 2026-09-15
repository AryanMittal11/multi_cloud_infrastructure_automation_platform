'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Project, Environment, Template, Deployment } from '../../../lib/api';
import { useAuth } from '../../../context/auth-context';
import { WizardStepper } from '../../../components/deployments/wizard-stepper';
import { DynamicForm } from '../../../components/deployments/dynamic-form';
import { PlanDiffView } from '../../../components/deployments/plan-diff-view';
import {
  FolderGit2,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  PlayCircle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Key,
} from 'lucide-react';

function DeploymentWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Step state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxStepReached, setMaxStepReached] = useState<number>(1);

  // Selections
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    searchParams.get('templateId') || ''
  );

  // Form values & validation
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Plan & Deployment State
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Query projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
    enabled: !!user,
  });

  // Query templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.templates.list(),
    enabled: !!user,
  });

  // Selected entities
  const selectedProject = projectsData?.projects?.find((p) => p.id === selectedProjectId);
  const selectedEnvironment = selectedProject?.environments?.find(
    (e) => e.id === selectedEnvironmentId
  );
  const selectedTemplate = templatesData?.templates?.find((t) => t.id === selectedTemplateId);

  // Auto-fill template default values when template is selected
  useEffect(() => {
    if (selectedTemplate?.inputSchema?.properties) {
      const initial: Record<string, any> = {};
      Object.entries(selectedTemplate.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
        if (prop.default !== undefined) {
          initial[key] = prop.default;
        }
      });
      setFormValues(initial);
    }
  }, [selectedTemplate]);

  // Query deployment polling during Step 4 & 5
  const { data: deploymentData, refetch: refetchDeployment } = useQuery({
    queryKey: ['deployment-wizard', activeDeploymentId],
    queryFn: () => api.deployments.get(activeDeploymentId!),
    enabled: !!activeDeploymentId && currentStep >= 4,
    refetchInterval: (query) => {
      const status = query.state.data?.deployment?.status;
      if (status === 'PLANNING') return 2000;
      return false;
    },
  });

  const deployment = deploymentData?.deployment;

  // Plan generation mutation
  const planMutation = useMutation({
    mutationFn: async () => {
      return api.deployments.createPlan({
        projectId: selectedProjectId,
        environmentId: selectedEnvironmentId,
        templateId: selectedTemplateId,
        configuration: formValues,
      });
    },
    onSuccess: (res) => {
      setActiveDeploymentId(res.deployment.id);
      setCurrentStep(4);
      setMaxStepReached((prev) => Math.max(prev, 4));
      setStepError(null);
    },
    onError: (err: any) => {
      setStepError(err.message || 'Failed to initiate planning dry-run');
    },
  });

  // Approval mutation
  const approveMutation = useMutation({
    mutationFn: async (confirmationKeyword?: string) => {
      if (!activeDeploymentId) throw new Error('No deployment to approve');
      return api.deployments.approve(activeDeploymentId, { confirmationKeyword });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      router.push(`/deployments/${activeDeploymentId}`);
    },
    onError: (err: any) => {
      setStepError(err.message || 'Approval rejected by authoritative backend');
    },
  });

  // Validation handler for Step 3
  const handleValidateForm = async () => {
    setFormErrors({});
    setValidationMessage(null);
    setStepError(null);

    // 1. Client-side check for required fields
    const required = selectedTemplate?.inputSchema?.required || [];
    const missing: Record<string, string> = {};
    required.forEach((field: string) => {
      if (
        formValues[field] === undefined ||
        formValues[field] === null ||
        String(formValues[field]).trim() === ''
      ) {
        missing[field] = 'This parameter is required';
      }
    });

    if (Object.keys(missing).length > 0) {
      setFormErrors(missing);
      return false;
    }

    // 2. Server-side dry-run parameter validation
    if (selectedTemplate) {
      try {
        const res = await api.templates.validate(selectedTemplate.id, formValues);
        if (res.valid) {
          setValidationMessage('Parameters successfully validated against schema');
          return true;
        } else {
          setStepError(res.message || 'Validation failed');
          return false;
        }
      } catch (err: any) {
        setStepError(err.message || 'Template validation error');
        return false;
      }
    }
    return true;
  };

  // Step 3 Next handler
  const handleProceedToPlan = async () => {
    const valid = await handleValidateForm();
    if (valid) {
      planMutation.mutate();
    }
  };

  const isOperator = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Stepper Navigation */}
      <WizardStepper
        currentStep={currentStep}
        onStepClick={(step) => setCurrentStep(step)}
        maxStepReached={maxStepReached}
      />

      {/* Unauthenticated Alert */}
      {!user && (
        <div className="p-6 rounded-2xl border border-neutral-500/30 bg-neutral-900 text-center space-y-3">
          <Key className="w-8 h-8 text-neutral-300 mx-auto" />
          <h2 className="text-sm font-bold text-white">Authentication Required</h2>
          <p className="text-xs text-neutral-300">
            Sign in with a Developer or Administrator persona to configure and approve infrastructure plans.
          </p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
          >
            Sign in to Continue
          </Link>
        </div>
      )}

      {/* Global Error Banner */}
      {stepError && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{stepError}</span>
        </div>
      )}

      {user && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 sm:p-8 space-y-6">
          {/* ========================================================= */}
          {/* STEP 1: Project & Environment Selection */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-neutral-800 pb-4">
                <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  <span>Step 1 of 5</span>
                </div>
                <h2 className="text-xl font-bold text-white">Select Deployment Target Context</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Choose the parent workspace project and target deployment environment tier.
                </p>
              </div>

              {/* Projects Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-200">1. Target Project Workspace *</label>
                {projectsLoading ? (
                  <div className="h-24 rounded-xl bg-neutral-950/60 animate-pulse border border-neutral-800" />
                ) : projectsData?.projects && projectsData.projects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {projectsData.projects.map((proj: Project) => {
                      const isSelected = selectedProjectId === proj.id;
                      return (
                        <div
                          key={proj.id}
                          onClick={() => {
                            setSelectedProjectId(proj.id);
                            // Auto-select first environment if available
                            if (proj.environments && proj.environments.length > 0) {
                              setSelectedEnvironmentId(proj.environments[0].id);
                            } else {
                              setSelectedEnvironmentId('');
                            }
                          }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-neutral-400 bg-neutral-900 ring-1 ring-neutral-400 shadow-md'
                              : 'border-neutral-800 bg-neutral-950/40 hover:border-neutral-700'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-white">{proj.name}</span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-neutral-300" />}
                            </div>
                            <p className="text-[11px] text-neutral-400 line-clamp-2">
                              {proj.description || 'Standard workspace'}
                            </p>
                          </div>
                          <div className="mt-3 text-[10px] text-neutral-500 font-mono">
                            {proj.environments?.length ?? 0} environment(s) configured
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-neutral-800 text-center text-xs text-neutral-400">
                    No projects found.{' '}
                    <Link href="/projects" className="text-neutral-300 underline">
                      Create a project first
                    </Link>
                    .
                  </div>
                )}
              </div>

              {/* Environments Selection */}
              {selectedProject && (
                <div className="space-y-3 pt-4 border-t border-neutral-800/80">
                  <label className="text-xs font-bold text-neutral-200">2. Target Environment Tier *</label>
                  {selectedProject.environments && selectedProject.environments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {selectedProject.environments.map((env: Environment) => {
                        const isSelected = selectedEnvironmentId === env.id;
                        const isProd = env.name.toLowerCase() === 'production';
                        const isStage = env.name.toLowerCase() === 'staging';

                        return (
                          <div
                            key={env.id}
                            onClick={() => setSelectedEnvironmentId(env.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-neutral-400 bg-neutral-900 ring-1 ring-neutral-400'
                                : 'border-neutral-800 bg-neutral-950/40 hover:border-neutral-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold uppercase tracking-wider ${
                                  isProd
                                    ? 'text-rose-400'
                                    : isStage
                                    ? 'text-amber-400'
                                    : 'text-neutral-300'
                                }`}
                              >
                                {env.name}
                              </span>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-neutral-300" />}
                            </div>
                            <div className="mt-2 text-[11px] text-neutral-400">
                              {isProd
                                ? 'Production Tier — Enforces strict admin confirmation'
                                : isStage
                                ? 'Staging Tier — Pre-release validation'
                                : 'Development Tier — Ephemeral testing'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs">
                      This project has no environments. Please add an environment in the Projects tab.
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Actions */}
              <div className="pt-4 border-t border-neutral-800 flex justify-end">
                <button
                  disabled={!selectedProjectId || !selectedEnvironmentId}
                  onClick={() => {
                    setCurrentStep(2);
                    setMaxStepReached((prev) => Math.max(prev, 2));
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-black/30 transition-all disabled:opacity-50"
                >
                  <span>Select Template</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: Template Selection */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-neutral-800 pb-4">
                <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  <span>Step 2 of 5</span>
                </div>
                <h2 className="text-xl font-bold text-white">Select Architecture Template</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Choose a verified Infrastructure as Code module to provision in{' '}
                  <strong className="text-neutral-200">{selectedEnvironment?.name}</strong>.
                </p>
              </div>

              {templatesLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-32 rounded-xl bg-neutral-950/60 animate-pulse border border-neutral-800" />
                  ))}
                </div>
              ) : templatesData?.templates && templatesData.templates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templatesData.templates.map((tmpl: Template) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    const isAws = tmpl.provider === 'AWS';

                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setSelectedTemplateId(tmpl.id)}
                        className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'border-neutral-400 bg-neutral-900 ring-1 ring-neutral-400 shadow-md'
                            : 'border-neutral-800 bg-neutral-950/40 hover:border-neutral-700'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-base font-bold text-white">{tmpl.name}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                    isAws
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                      : 'bg-white/5 text-neutral-300 border-neutral-500/30'
                                  }`}
                                >
                                  {tmpl.provider || 'CROSS-CLOUD'}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-400">
                                  v{tmpl.version}
                                </span>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-neutral-300" />}
                          </div>

                          <p className="text-xs text-neutral-400 leading-relaxed">
                            {tmpl.description || 'Verified infrastructure module archetype.'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-500 font-mono">
                          {Object.keys(tmpl.inputSchema?.properties || {}).length} configurable inputs
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl border border-dashed border-neutral-800 text-xs text-neutral-400">
                  No templates available in catalog.
                </div>
              )}

              {/* Navigation Actions */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white flex items-center space-x-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  disabled={!selectedTemplateId}
                  onClick={() => {
                    setCurrentStep(3);
                    setMaxStepReached((prev) => Math.max(prev, 3));
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-black/30 transition-all disabled:opacity-50"
                >
                  <span>Configure Parameters</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: Dynamic JSONSchema Parameter Form */}
          {/* ========================================================= */}
          {currentStep === 3 && selectedTemplate && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-neutral-800 pb-4">
                <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  <span>Step 3 of 5</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  Configure {selectedTemplate.name} Parameters
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Input parameter fields are dynamically generated from the module JSONSchema contract.
                </p>
              </div>

              {validationMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-neutral-500/30 text-neutral-200 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-neutral-300" />
                  <span>{validationMessage}</span>
                </div>
              )}

              {/* Dynamic Parameter Form */}
              <DynamicForm
                schema={selectedTemplate.inputSchema}
                values={formValues}
                onChange={(field, val) =>
                  setFormValues((prev) => ({
                    ...prev,
                    [field]: val,
                  }))
                }
                errors={formErrors}
              />

              {/* Navigation Actions */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white flex items-center space-x-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleValidateForm}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-all"
                  >
                    Validate Inputs
                  </button>

                  <button
                    type="button"
                    disabled={planMutation.isPending}
                    onClick={handleProceedToPlan}
                    className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-black/30 transition-all disabled:opacity-50"
                  >
                    {planMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Plan...</span>
                      </>
                    ) : (
                      <>
                        <span>Generate Dry-Run Plan</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: Plan Review Screen (Diff View) */}
          {/* ========================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-neutral-800 pb-4">
                <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  <span>Step 4 of 5</span>
                </div>
                <h2 className="text-xl font-bold text-white">Dry-Run Execution & Diff Review</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Review planned resource creations and modifications prior to entering the approval gate.
                </p>
              </div>

              {/* Polling / Status indicator */}
              {deployment?.status === 'PLANNING' ? (
                <div className="p-12 text-center rounded-2xl border border-neutral-800 bg-neutral-950/60 space-y-4">
                  <Loader2 className="w-10 h-10 text-neutral-300 animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">
                      Generating Terraform Dry-Run Preview...
                    </h3>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto">
                      The isolated worker process is evaluating resource attributes and computing delta changes against AWS.
                    </p>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500">
                    Deployment #{activeDeploymentId?.slice(0, 8)} &bull; Status: PLANNING
                  </div>
                </div>
              ) : deployment?.status === 'FAILED' ? (
                <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-300 space-y-3">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Plan Generation Failed</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-rose-300 overflow-x-auto whitespace-pre-wrap">
                    {deployment.planOutput || 'Terraform plan encountered an error during execution.'}
                  </pre>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold"
                  >
                    Adjust Parameters
                  </button>
                </div>
              ) : (
                <PlanDiffView
                  planOutput={deployment?.planOutput || ''}
                  configuration={formValues}
                  costEstimate={deployment?.costEstimate}
                  policyEvaluation={deployment?.policyEvaluation}
                />
              )}

              {/* Navigation Actions */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white flex items-center space-x-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Adjust Parameters</span>
                </button>

                <button
                  disabled={deployment?.status !== 'PLANNED'}
                  onClick={() => {
                    setCurrentStep(5);
                    setMaxStepReached((prev) => Math.max(prev, 5));
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-black/30 transition-all disabled:opacity-50"
                >
                  <span>Proceed to Approval Gate</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 5: Explicit Approval Gate */}
          {/* ========================================================= */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="border-b border-neutral-800 pb-4">
                <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  <span>Step 5 of 5</span>
                </div>
                <h2 className="text-xl font-bold text-white">Authoritative Approval Gate</h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Explicit signoff required to dispatch asynchronous execution to RabbitMQ worker queue.
                </p>
              </div>

              {/* Recap Card */}
              <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-950/60 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Deployment Specification Summary
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-neutral-400">Target Project:</span>
                    <div className="font-bold text-white">{selectedProject?.name}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-400">Environment Tier:</span>
                    <div className="font-bold text-neutral-200 uppercase">{selectedEnvironment?.name}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-400">IaC Module:</span>
                    <div className="font-bold text-neutral-300">{selectedTemplate?.name} (v{selectedTemplate?.version})</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-400">Signing Operator:</span>
                    <div className="font-bold text-white flex items-center space-x-2">
                      <span>{user.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-600/50">
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role Check Alert */}
              {!isOperator ? (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-start space-x-3">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">Approval Blocked (Role: VIEWER)</span>
                    <p className="text-[11px] leading-relaxed">
                      Your current persona ({user.role}) has read-only auditor access. Deploying live infrastructure changes requires <strong>DEVELOPER</strong> or <strong>ADMIN</strong> authority. Use the top-right persona switcher to simulate an authorized role.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-neutral-500/30 bg-emerald-950/20 text-neutral-200 text-xs flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-neutral-300" />
                  <div className="space-y-1">
                    <span className="font-bold">Permission Verified</span>
                    <p className="text-[11px] leading-relaxed">
                      Your role ({user.role}) is authorized to approve this plan. Upon clicking below, an immutable audit event will be recorded and an APPLY job dispatched to the isolated worker queue.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white flex items-center space-x-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Diff</span>
                </button>

                <button
                  disabled={!isOperator || approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {approveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing & Queuing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Dispatch Execution</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeploymentWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-neutral-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-neutral-400 mb-2" />
          <span>Loading Deployment Wizard...</span>
        </div>
      }
    >
      <DeploymentWizardContent />
    </Suspense>
  );
}
