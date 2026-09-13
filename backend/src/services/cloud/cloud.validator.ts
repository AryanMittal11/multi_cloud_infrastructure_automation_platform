import crypto from 'crypto';
import {
  AwsCredentials,
  AzureCredentials,
  GcpCredentials,
  CallerIdentityResult,
} from './cloud.types';

// ==========================================
// AWS Credential Validation (STS GetCallerIdentity)
// ==========================================

/**
 * Validates AWS credentials format and verifies identity against AWS STS GetCallerIdentity.
 */
export async function validateAwsCredentials(
  credentials: AwsCredentials,
  skipValidation: boolean = false,
): Promise<CallerIdentityResult> {
  const { accessKeyId, secretAccessKey, sessionToken, defaultRegion = 'us-east-1' } = credentials;

  // 1. Basic format validations
  if (!accessKeyId || !secretAccessKey) {
    const error: any = new Error('AWS accessKeyId and secretAccessKey are required');
    error.statusCode = 400;
    throw error;
  }

  // AWS Access Key ID format: 16-128 uppercase alphanumeric characters
  const accessKeyRegex = /^(?:AKIA|ASIA|AROA|AIDA)[A-Z0-9]{16}$/;
  if (!accessKeyRegex.test(accessKeyId) && !accessKeyId.startsWith('AKIA_MOCK_')) {
    const error: any = new Error(
      'Invalid AWS Access Key ID format. Expected 20-character key starting with AKIA or ASIA',
    );
    error.statusCode = 400;
    throw error;
  }

  if (secretAccessKey.length < 16) {
    const error: any = new Error('Invalid AWS Secret Access Key length');
    error.statusCode = 400;
    throw error;
  }

  // 2. Return mock caller identity if offline/sandbox mode is requested
  if (skipValidation || accessKeyId.startsWith('AKIA_MOCK_')) {
    return {
      account: '123456789012',
      arn: `arn:aws:iam::123456789012:user/platform-operator`,
      userId: accessKeyId,
    };
  }

  // 3. AWS STS GetCallerIdentity via Signature Version 4
  try {
    const host = `sts.${defaultRegion}.amazonaws.com`;
    const endpoint = `https://${host}/`;
    const action = 'Action=GetCallerIdentity&Version=2011-06-15';
    const body = action;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
    const dateStamp = amzDate.slice(0, 8); // YYYYMMDD

    // Hash the payload
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    // Canonical headers
    const canonicalHeaders =
      `content-type:application/x-www-form-urlencoded; charset=utf-8\n` +
      `host:${host}\n` +
      `x-amz-date:${amzDate}\n` +
      (sessionToken ? `x-amz-security-token:${sessionToken}\n` : '');

    const signedHeaders = sessionToken
      ? 'content-type;host;x-amz-date;x-amz-security-token'
      : 'content-type;host;x-amz-date';

    const canonicalRequest =
      `POST\n/\n\n` +
      `${canonicalHeaders}\n` +
      `${signedHeaders}\n` +
      `${payloadHash}`;

    // String to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${defaultRegion}/sts/aws4_request`;
    const stringToSign =
      `${algorithm}\n${amzDate}\n${credentialScope}\n` +
      crypto.createHash('sha256').update(canonicalRequest).digest('hex');

    // Calculate signature
    const kDate = crypto.createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(defaultRegion).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('sts').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorizationHeader =
      `${algorithm} Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
      'X-Amz-Date': amzDate,
      Authorization: authorizationHeader,
      Accept: 'application/json',
    };
    if (sessionToken) {
      headers['X-Amz-Security-Token'] = sessionToken;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(6000), // 6 second network timeout
    });

    const responseText = await response.text();

    if (!response.ok) {
      const error: any = new Error(
        `AWS STS validation failed (${response.status}): Invalid credentials or permissions`,
      );
      error.statusCode = 400;
      throw error;
    }

    // Extract Account, Arn, and UserId from XML response
    const accountMatch = responseText.match(/<Account>([0-9]{12})<\/Account>/);
    const arnMatch = responseText.match(/<Arn>([^<]+)<\/Arn>/);
    const userIdMatch = responseText.match(/<UserId>([^<]+)<\/UserId>/);

    return {
      account: accountMatch ? accountMatch[1] : 'unknown',
      arn: arnMatch ? arnMatch[1] : `arn:aws:iam::unknown:user`,
      userId: userIdMatch ? userIdMatch[1] : accessKeyId,
    };
  } catch (err: any) {
    if (err.statusCode) throw err;
    const error: any = new Error(`AWS STS verification failed: ${err.message}`);
    error.statusCode = 400;
    throw error;
  }
}

// ==========================================
// Azure Credential Validation (ARM Subscriptions - Get)
// ==========================================

/**
 * Validates Azure Service Principal credentials format and verifies access
 * against the Azure Resource Manager REST API (Subscriptions - Get).
 */
export async function validateAzureCredentials(
  credentials: AzureCredentials,
  skipValidation: boolean = false,
): Promise<{ subscriptionId: string; displayName: string; tenantId: string }> {
  const { clientId, clientSecret, tenantId, subscriptionId } = credentials;

  // 1. Basic format validations
  if (!clientId || !clientSecret || !tenantId || !subscriptionId) {
    const error: any = new Error(
      'Azure clientId, clientSecret, tenantId, and subscriptionId are required',
    );
    error.statusCode = 400;
    throw error;
  }

  // UUID format checks (GUIDs are used for client/tenant/subscription IDs)
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (!uuidRegex.test(clientId)) {
    const error: any = new Error('Invalid Azure Client ID format. Expected a UUID (Application ID)');
    error.statusCode = 400;
    throw error;
  }
  if (!uuidRegex.test(tenantId)) {
    const error: any = new Error('Invalid Azure Tenant ID format. Expected a UUID (Directory ID)');
    error.statusCode = 400;
    throw error;
  }
  if (!uuidRegex.test(subscriptionId)) {
    const error: any = new Error('Invalid Azure Subscription ID format. Expected a UUID');
    error.statusCode = 400;
    throw error;
  }

  if (clientSecret.length < 8) {
    const error: any = new Error('Invalid Azure Client Secret length');
    error.statusCode = 400;
    throw error;
  }

  // 2. Return mock identity if offline/sandbox mode is requested
  if (skipValidation) {
    return {
      subscriptionId,
      displayName: 'mock-azure-subscription',
      tenantId,
    };
  }

  // 3. Acquire OAuth2 access token from Azure AD (client credentials flow)
  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://management.azure.com/.default',
    });

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
      signal: AbortSignal.timeout(6000),
    });

    if (!tokenResponse.ok) {
      const error: any = new Error(
        `Azure AD token acquisition failed (${tokenResponse.status}): Invalid client credentials or tenant`,
      );
      error.statusCode = 400;
      throw error;
    }

    const tokenData: any = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 4. Verify subscription access via Azure Resource Manager REST ping
    const armEndpoint = `https://management.azure.com/subscriptions/${subscriptionId}?api-version=2022-12-01`;
    const armResponse = await fetch(armEndpoint, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(6000),
    });

    if (!armResponse.ok) {
      const error: any = new Error(
        `Azure subscription validation failed (${armResponse.status}): Service Principal lacks access to subscription`,
      );
      error.statusCode = 400;
      throw error;
    }

    const subscription: any = await armResponse.json();

    return {
      subscriptionId: subscription.subscriptionId || subscriptionId,
      displayName: subscription.displayName || 'unknown-subscription',
      tenantId: subscription.tenantId || tenantId,
    };
  } catch (err: any) {
    if (err.statusCode) throw err;
    const error: any = new Error(`Azure ARM verification failed: ${err.message}`);
    error.statusCode = 400;
    throw error;
  }
}

// ==========================================
// GCP Credential Validation (Cloud Resource Manager projects.get)
// ==========================================

/**
 * Validates GCP Service Account credentials format and verifies project access
 * via the Google Cloud Resource Manager API (projects.get).
 */
export async function validateGcpCredentials(
  credentials: GcpCredentials,
  skipValidation: boolean = false,
): Promise<{ projectId: string; projectNumber: string; serviceAccountEmail: string }> {
  const { projectId, clientEmail, privateKey } = credentials;

  // 1. Basic format validations
  if (!projectId || !clientEmail || !privateKey) {
    const error: any = new Error('GCP projectId, clientEmail, and privateKey are required');
    error.statusCode = 400;
    throw error;
  }

  // GCP project ID: 6-30 lowercase letters, digits, hyphens; must start with letter
  const projectIdRegex = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
  if (!projectIdRegex.test(projectId)) {
    const error: any = new Error(
      'Invalid GCP Project ID format. Expected 6-30 lowercase alphanumeric characters or hyphens',
    );
    error.statusCode = 400;
    throw error;
  }

  // Service account email format: name@project.iam.gserviceaccount.com
  const serviceAccountRegex = /^[a-z][a-z0-9-]*@.*\.iam\.gserviceaccount\.com$/;
  if (!serviceAccountRegex.test(clientEmail)) {
    const error: any = new Error(
      'Invalid GCP Client Email format. Expected a service account email ending in .iam.gserviceaccount.com',
    );
    error.statusCode = 400;
    throw error;
  }

  if (!privateKey.includes('PRIVATE KEY')) {
    const error: any = new Error(
      'Invalid GCP Private Key format. Expected a PEM-encoded RSA private key',
    );
    error.statusCode = 400;
    throw error;
  }

  // 2. Return mock identity if offline/sandbox mode is requested
  if (skipValidation) {
    return {
      projectId,
      projectNumber: '000000000000',
      serviceAccountEmail: clientEmail,
    };
  }

  // 3. Sign a JWT with the service account private key and exchange it for an OAuth2 token
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claims = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/cloud-platform.read-only',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const encodeBase64Url = (obj: any) =>
      Buffer.from(JSON.stringify(obj)).toString('base64url');

    const jwtHeader = encodeBase64Url(header);
    const jwtPayload = encodeBase64Url(claims);
    const jwtSignatureInput = `${jwtHeader}.${jwtPayload}`;

    const jwtSignature = crypto
      .createSign('RSA-SHA256')
      .update(jwtSignatureInput)
      .sign(privateKey.replace(/\\n/g, '\n'));
    const jwtToken = `${jwtSignatureInput}.${jwtSignature.toString('base64url')}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken,
      }).toString(),
      signal: AbortSignal.timeout(6000),
    });

    if (!tokenResponse.ok) {
      const error: any = new Error(
        `GCP token exchange failed (${tokenResponse.status}): Invalid service account credentials`,
      );
      error.statusCode = 400;
      throw error;
    }

    const tokenData: any = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 4. Verify project access via Cloud Resource Manager API (projects.get)
    const crmResponse = await fetch(
      `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(6000),
      },
    );

    if (!crmResponse.ok) {
      const error: any = new Error(
        `GCP project validation failed (${crmResponse.status}): Service account lacks access to project`,
      );
      error.statusCode = 400;
      throw error;
    }

    const project: any = await crmResponse.json();

    return {
      projectId: project.projectId || projectId,
      projectNumber: project.projectNumber || 'unknown',
      serviceAccountEmail: clientEmail,
    };
  } catch (err: any) {
    if (err.statusCode) throw err;
    const error: any = new Error(`GCP Resource Manager verification failed: ${err.message}`);
    error.statusCode = 400;
    throw error;
  }
}
