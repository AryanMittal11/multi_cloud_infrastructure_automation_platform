import crypto from 'crypto';
import { AwsCredentials, CallerIdentityResult } from './cloud.types';

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
