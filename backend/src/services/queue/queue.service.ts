import amqplib, { ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { EventEmitter } from 'events';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { QUEUE_EXCHANGES, QUEUES, ROUTING_KEYS } from './queue.constants';
import { DeploymentJobMessage, DeploymentEventMessage, QueueStatus, JobAction } from './queue.types';

export class QueueService {
  private connection: ChannelModel | null = null;
  private publishChannel: Channel | null = null;
  private isConnecting: boolean = false;
  private inMemoryFallback: boolean = false;
  private fallbackEmitter: EventEmitter = new EventEmitter();
  private queuedJobs: DeploymentJobMessage[] = [];

  constructor() {
    this.fallbackEmitter.setMaxListeners(50);
  }

  /**
   * Initializes the AMQP connection, asserts exchanges, queues, DLQ, and bindings.
   */
  async initialize(): Promise<void> {
    if (this.connection && this.publishChannel) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      logger.info(`Connecting to RabbitMQ broker at ${env.RABBITMQ_URL}...`);
      const conn = await amqplib.connect(env.RABBITMQ_URL);
      const channel = await conn.createChannel();

      // Configure Connection Error Handlers
      conn.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.resetConnection();
      });

      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed. Reconnection required.');
        this.resetConnection();
      });

      // 1. Assert Main and Dead-Letter Exchanges
      await channel.assertExchange(QUEUE_EXCHANGES.DEPLOYMENTS, 'topic', { durable: true });
      await channel.assertExchange(QUEUE_EXCHANGES.DEPLOYMENTS_DLX, 'topic', { durable: true });

      // 2. Assert Dead Letter Queue (DLQ)
      await channel.assertQueue(QUEUES.DEPLOYMENT_JOBS_DLQ, { durable: true });
      await channel.bindQueue(QUEUES.DEPLOYMENT_JOBS_DLQ, QUEUE_EXCHANGES.DEPLOYMENTS_DLX, '#');

      // 3. Assert Jobs Queue with Dead Letter routing
      await channel.assertQueue(QUEUES.DEPLOYMENT_JOBS, {
        durable: true,
        deadLetterExchange: QUEUE_EXCHANGES.DEPLOYMENTS_DLX,
        deadLetterRoutingKey: 'deployment.job.dead',
      });
      await channel.bindQueue(QUEUES.DEPLOYMENT_JOBS, QUEUE_EXCHANGES.DEPLOYMENTS, ROUTING_KEYS.JOB_ALL);

      // 4. Assert Events Queue
      await channel.assertQueue(QUEUES.DEPLOYMENT_EVENTS, { durable: true });
      await channel.bindQueue(QUEUES.DEPLOYMENT_EVENTS, QUEUE_EXCHANGES.DEPLOYMENTS, ROUTING_KEYS.EVENT_ALL);

      this.connection = conn;
      this.publishChannel = channel;
      this.inMemoryFallback = false;
      this.isConnecting = false;

      logger.info('✅ RabbitMQ broker connected and persistent topology initialized.');
    } catch (err: any) {
      this.isConnecting = false;
      this.inMemoryFallback = true;
      logger.warn(
        `RabbitMQ broker not reachable (${err.message}). Activating resilient In-Memory Event Queue fallback mode.`,
      );
    }
  }

  /**
   * Publishes an infrastructure deployment job to RabbitMQ with persistent delivery.
   */
  async publishJob(job: DeploymentJobMessage, action: JobAction = 'APPLY'): Promise<boolean> {
    const routingKey =
      action === 'PLAN'
        ? ROUTING_KEYS.JOB_PLAN
        : action === 'DESTROY'
          ? ROUTING_KEYS.JOB_DESTROY
          : ROUTING_KEYS.JOB_APPLY;

    const payloadBuffer = Buffer.from(JSON.stringify(job));

    if (this.publishChannel && !this.inMemoryFallback) {
      try {
        const published = this.publishChannel.publish(
          QUEUE_EXCHANGES.DEPLOYMENTS,
          routingKey,
          payloadBuffer,
          {
            persistent: true, // DeliveryMode: 2 (Persistent on disk)
            contentType: 'application/json',
            timestamp: Date.now(),
            messageId: job.deploymentId,
            correlationId: job.correlationId || job.deploymentId,
          },
        );

        logger.info(`Dispatched deployment job [${job.deploymentId}] (${action}) to RabbitMQ`);
        return published;
      } catch (err) {
        logger.error(`Failed to publish job to RabbitMQ: ${err}. Falling back to in-memory dispatch.`);
      }
    }

    // Fallback: In-memory queuing
    this.queuedJobs.push(job);
    logger.info(`Dispatched deployment job [${job.deploymentId}] (${action}) via In-Memory queue fallback`);
    setImmediate(() => {
      this.fallbackEmitter.emit('job', job);
    });
    return true;
  }

  /**
   * Publishes worker execution lifecycle events (log chunks, status transitions).
   */
  async publishEvent(event: DeploymentEventMessage): Promise<boolean> {
    const routingKey =
      event.eventType === 'STARTED'
        ? ROUTING_KEYS.EVENT_STARTED
        : event.eventType === 'LOG_CHUNK'
          ? ROUTING_KEYS.EVENT_LOG
          : event.eventType === 'COMPLETED'
            ? ROUTING_KEYS.EVENT_COMPLETED
            : event.eventType === 'FAILED'
              ? ROUTING_KEYS.EVENT_FAILED
              : ROUTING_KEYS.EVENT_STATE;

    const payloadBuffer = Buffer.from(JSON.stringify(event));

    if (this.publishChannel && !this.inMemoryFallback) {
      try {
        return this.publishChannel.publish(
          QUEUE_EXCHANGES.DEPLOYMENTS,
          routingKey,
          payloadBuffer,
          {
            contentType: 'application/json',
            timestamp: Date.now(),
          },
        );
      } catch (err) {
        logger.error(`Failed to publish event to RabbitMQ: ${err}`);
      }
    }

    // Fallback: In-memory emit
    setImmediate(() => {
      this.fallbackEmitter.emit('event', event);
    });
    return true;
  }

  /**
   * Consumes deployment jobs with fair dispatching (prefetch: 1) and explicit ack/nack semantics.
   */
  async consumeJobs(
    handler: (
      job: DeploymentJobMessage,
      ack: () => void,
      nack: (requeue?: boolean) => void,
    ) => Promise<void>,
  ): Promise<void> {
    // Register in-memory fallback listener synchronously to avoid race conditions during async initialization
    this.fallbackEmitter.on('job', async (job: DeploymentJobMessage) => {
      const ack = () => {
        this.queuedJobs = this.queuedJobs.filter((j) => j.deploymentId !== job.deploymentId);
      };
      const nack = (requeue: boolean = false) => {
        if (!requeue) {
          this.queuedJobs = this.queuedJobs.filter((j) => j.deploymentId !== job.deploymentId);
        }
      };

      try {
        await handler(job, ack, nack);
      } catch (err) {
        logger.error('Error in in-memory job handler:', err);
        nack(false);
      }
    });

    await this.initialize();

    if (this.connection && !this.inMemoryFallback) {
      const consumerChannel = await this.connection.createChannel();
      // Fair dispatching: Worker processes strictly 1 job at a time
      await consumerChannel.prefetch(1);

      await consumerChannel.consume(
        QUEUES.DEPLOYMENT_JOBS,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const job: DeploymentJobMessage = JSON.parse(msg.content.toString('utf8'));
            const ack = () => consumerChannel.ack(msg);
            const nack = (requeue: boolean = false) => consumerChannel.nack(msg, false, requeue);

            await handler(job, ack, nack);
          } catch (err) {
            logger.error('Error processing consumed job message:', err);
            // Route to DLQ without requeuing if malformed
            consumerChannel.nack(msg, false, false);
          }
        },
        { noAck: false }, // Explicit ACK required
      );

      logger.info('👷 Subscribed to RabbitMQ deployment_jobs queue with prefetch(1)');
      return;
    }

    logger.info('👷 Subscribed to In-Memory deployment_jobs fallback queue');
  }

  /**
   * Consumes deployment lifecycle events.
   */
  async consumeEvents(
    handler: (event: DeploymentEventMessage, ack: () => void) => Promise<void>,
  ): Promise<void> {
    // Register in-memory fallback listener synchronously
    this.fallbackEmitter.on('event', async (event: DeploymentEventMessage) => {
      try {
        await handler(event, () => {});
      } catch (err) {
        logger.error('Error in in-memory event handler:', err);
      }
    });

    await this.initialize();

    if (this.connection && !this.inMemoryFallback) {
      const consumerChannel = await this.connection.createChannel();
      await consumerChannel.prefetch(20);

      await consumerChannel.consume(
        QUEUES.DEPLOYMENT_EVENTS,
        async (msg: ConsumeMessage | null) => {
          if (!msg) return;

          try {
            const event: DeploymentEventMessage = JSON.parse(msg.content.toString('utf8'));
            const ack = () => consumerChannel.ack(msg);
            await handler(event, ack);
          } catch (err) {
            logger.error('Error processing event message:', err);
            consumerChannel.ack(msg); // Drop malformed event
          }
        },
        { noAck: false },
      );
      return;
    }
  }

  /**
   * Returns current health and queue metrics.
   */
  async getStatus(): Promise<QueueStatus> {
    let jobsQueueCount = this.queuedJobs.length;
    let eventsQueueCount = 0;

    if (this.publishChannel && !this.inMemoryFallback) {
      try {
        const jobsInfo = await this.publishChannel.checkQueue(QUEUES.DEPLOYMENT_JOBS);
        const eventsInfo = await this.publishChannel.checkQueue(QUEUES.DEPLOYMENT_EVENTS);
        jobsQueueCount = jobsInfo.messageCount;
        eventsQueueCount = eventsInfo.messageCount;
      } catch {
        // Ignored if checking channel fails
      }
    }

    return {
      connected: this.connection !== null && !this.inMemoryFallback,
      jobsQueueCount,
      eventsQueueCount,
      mode: this.inMemoryFallback ? 'in-memory-fallback' : 'rabbitmq',
    };
  }

  /**
   * Gracefully closes channels and connections on shutdown.
   */
  async closeConnection(): Promise<void> {
    try {
      if (this.publishChannel) {
        await this.publishChannel.close();
        this.publishChannel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.inMemoryFallback = false;
      logger.info('RabbitMQ connection cleanly closed');
    } catch (err) {
      logger.error('Error closing RabbitMQ connection:', err);
    }
  }

  private resetConnection(): void {
    this.connection = null;
    this.publishChannel = null;
    this.inMemoryFallback = true;
  }
}

export const queueService = new QueueService();
