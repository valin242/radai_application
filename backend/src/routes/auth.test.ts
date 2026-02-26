import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { prisma } from '../lib/prisma';

describe('POST /auth/signup', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(authRoutes, { prefix: '/auth' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should create a new user account with valid email and password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
      },
    });

    if (response.statusCode !== 201) {
      console.log('Response body:', response.body);
    }

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('user_id');
    expect(body).toHaveProperty('token');
    expect(typeof body.user_id).toBe('string');
    expect(typeof body.token).toBe('string');

    // Verify user was created in database with default "free" tier
    const user = await prisma.user.findUnique({
      where: { id: body.user_id },
    });
    expect(user).toBeTruthy();
    expect(user?.tier).toBe('free');
    expect(user?.email).toContain('test-');
  });

  it('should return 400 when email is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('MISSING_FIELDS');
    expect(body.error.message).toContain('Email and password are required');
  });

  it('should return 400 when password is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'test@example.com',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('MISSING_FIELDS');
  });

  it('should return 400 when email format is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'invalid-email',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_EMAIL');
    expect(body.error.message).toContain('Invalid email format');
  });

  it('should return 400 when password is too short', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email: 'test@example.com',
        password: 'short',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('INVALID_PASSWORD');
    expect(body.error.message).toContain('at least 8 characters');
  });

  it('should return 400 when email already exists', async () => {
    const email = `duplicate-${Date.now()}@example.com`;
    
    // Create first user
    await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email,
        password: 'password123',
      },
    });

    // Try to create duplicate
    const response = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email,
        password: 'password456',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('EMAIL_EXISTS');
    expect(body.error.message).toContain('already exists');
  });

  it('should store user record with id, email, tier, and created_at', async () => {
    const email = `test-fields-${Date.now()}@example.com`;
    
    const response = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        email,
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);

    // Verify all required fields are present
    const user = await prisma.user.findUnique({
      where: { id: body.user_id },
    });

    expect(user).toBeTruthy();
    expect(user?.id).toBe(body.user_id);
    expect(user?.email).toBe(email);
    expect(user?.tier).toBe('free');
    expect(user?.createdAt).toBeInstanceOf(Date);
  });
});

describe('POST /auth/login', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(authRoutes, { prefix: '/auth' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should authenticate user with valid credentials', async () => {
    // First create a user
    const email = `login-test-${Date.now()}@example.com`;
    const password = 'password123';
    
    const signupResponse = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email, password },
    });

    expect(signupResponse.statusCode).toBe(201);

    // Now login with the same credentials
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    });

    expect(loginResponse.statusCode).toBe(200);
    const body = JSON.parse(loginResponse.body);
    expect(body).toHaveProperty('user_id');
    expect(body).toHaveProperty('token');
    expect(typeof body.user_id).toBe('string');
    expect(typeof body.token).toBe('string');
  });

  it('should return 401 with invalid password', async () => {
    // First create a user
    const email = `login-invalid-${Date.now()}@example.com`;
    const password = 'password123';
    
    await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email, password },
    });

    // Try to login with wrong password
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'wrongpassword' },
    });

    expect(loginResponse.statusCode).toBe(401);
    const body = JSON.parse(loginResponse.body);
    expect(body.error.code).toBe('AUTHENTICATION_FAILED');
    expect(body.error.message).toContain('Invalid email or password');
  });

  it('should return 401 with non-existent email', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: `nonexistent-${Date.now()}@example.com`,
        password: 'password123',
      },
    });

    expect(loginResponse.statusCode).toBe(401);
    const body = JSON.parse(loginResponse.body);
    expect(body.error.code).toBe('AUTHENTICATION_FAILED');
    expect(body.error.message).toContain('Invalid email or password');
  });

  it('should return 400 when email is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('MISSING_FIELDS');
    expect(body.error.message).toContain('Email and password are required');
  });

  it('should return 400 when password is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'test@example.com',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('MISSING_FIELDS');
  });
});
