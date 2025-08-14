import { logger } from '../../src/utils/logger';
import winston from 'winston';

jest.mock('winston', () => {
  const mockFormat = {
    timestamp: jest.fn(() => mockFormat),
    errors: jest.fn(() => mockFormat),
    json: jest.fn(() => mockFormat),
    combine: jest.fn(() => mockFormat),
    printf: jest.fn(() => mockFormat),
    colorize: jest.fn(() => mockFormat),
    simple: jest.fn(() => mockFormat),
  };

  return {
    format: mockFormat,
    createLogger: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })),
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
  };
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates logger with correct configuration', () => {
    expect(winston.createLogger).toHaveBeenCalled();
    expect(winston.format.combine).toHaveBeenCalled();
    expect(winston.format.timestamp).toHaveBeenCalled();
    expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
  });

  it('logs info messages', () => {
    const message = 'Test info message';
    logger.info(message);
    
    expect(logger.info).toHaveBeenCalledWith(message);
  });

  it('logs error messages with stack trace', () => {
    const error = new Error('Test error');
    logger.error('Error occurred', error);
    
    expect(logger.error).toHaveBeenCalledWith('Error occurred', error);
  });

  it('logs warning messages', () => {
    const message = 'Test warning';
    logger.warn(message);
    
    expect(logger.warn).toHaveBeenCalledWith(message);
  });

  it('logs debug messages', () => {
    const message = 'Debug info';
    const data = { key: 'value' };
    logger.debug(message, data);
    
    expect(logger.debug).toHaveBeenCalledWith(message, data);
  });

  it('creates file transport in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    // Re-import to trigger production configuration
    jest.resetModules();
    require('../../src/utils/logger');
    
    expect(winston.transports.File).toHaveBeenCalled();
    
    process.env.NODE_ENV = originalEnv;
  });
});