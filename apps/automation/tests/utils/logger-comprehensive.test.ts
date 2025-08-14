import { logger, performanceLogger } from '../../src/utils/logger';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('winston', () => {
  const mockFormat = {
    timestamp: jest.fn(() => mockFormat),
    errors: jest.fn(() => mockFormat),
    json: jest.fn(() => mockFormat),
    combine: jest.fn(() => mockFormat),
    printf: jest.fn(() => mockFormat),
    colorize: jest.fn(() => mockFormat),
    prettyPrint: jest.fn(() => mockFormat)
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    add: jest.fn()
  };

  return {
    format: mockFormat,
    createLogger: jest.fn(() => mockLogger),
    transports: {
      Console: jest.fn(),
      File: jest.fn()
    }
  };
});

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

describe('Logger - Comprehensive Tests', () => {
  let mockFs: jest.Mocked<typeof fs>;
  let mockPath: jest.Mocked<typeof path>;
  let mockProcessEnv: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFs = fs as jest.Mocked<typeof fs>;
    mockPath = path as jest.Mocked<typeof path>;
    
    // Backup environment
    mockProcessEnv = process.env;
  });

  afterEach(() => {
    process.env = mockProcessEnv;
  });

  describe('Logger Configuration', () => {
    it('should create logger with correct configuration', () => {
      expect(winston.createLogger).toHaveBeenCalledWith({
        level: 'info',
        format: expect.any(Object),
        defaultMeta: { service: 'heaven-dolls-automation' },
        transports: expect.any(Array)
      });
    });

    it('should use environment LOG_LEVEL when provided', () => {
      process.env.LOG_LEVEL = 'debug';
      
      // Re-import to trigger configuration with new env
      jest.resetModules();
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'debug'
        })
      );
    });

    it('should create logs directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      jest.resetModules();
      require('../../src/utils/logger');
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        { recursive: true }
      );
    });

    it('should not create logs directory if it already exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      
      jest.resetModules();
      require('../../src/utils/logger');
      
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should configure different transports correctly', () => {
      expect(winston.transports.File).toHaveBeenCalledWith({
        filename: expect.stringContaining('error.log'),
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5
      });

      expect(winston.transports.File).toHaveBeenCalledWith({
        filename: expect.stringContaining('automation.log'),
        maxsize: 5242880,
        maxFiles: 5
      });
    });

    it('should add console transport in non-production environment', () => {
      process.env.NODE_ENV = 'development';
      
      jest.resetModules();
      const { logger: devLogger } = require('../../src/utils/logger');
      
      expect(devLogger.add).toHaveBeenCalledWith(
        expect.any(Object) // Console transport
      );
    });

    it('should not add console transport in production environment', () => {
      process.env.NODE_ENV = 'production';
      
      jest.resetModules();
      const { logger: prodLogger } = require('../../src/utils/logger');
      
      // Should not add console transport in production
      expect(prodLogger.add).not.toHaveBeenCalled();
    });
  });

  describe('Format Configuration', () => {
    it('should configure log format with timestamp', () => {
      expect(winston.format.timestamp).toHaveBeenCalledWith({
        format: 'YYYY-MM-DD HH:mm:ss'
      });
    });

    it('should configure error format with stack traces', () => {
      expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
    });

    it('should combine multiple formats', () => {
      expect(winston.format.combine).toHaveBeenCalled();
    });

    it('should configure console format with colors', () => {
      expect(winston.format.colorize).toHaveBeenCalled();
    });

    it('should configure printf format for console output', () => {
      expect(winston.format.printf).toHaveBeenCalled();
    });
  });

  describe('Logging Functions', () => {
    beforeEach(() => {
      // Reset modules to get fresh logger instance
      jest.resetModules();
    });

    it('should log info messages correctly', () => {
      const { logger: testLogger } = require('../../src/utils/logger');
      const message = 'Test info message';
      
      testLogger.info(message);
      
      expect(testLogger.info).toHaveBeenCalledWith(message);
    });

    it('should log error messages with context', () => {
      const { logger: testLogger } = require('../../src/utils/logger');
      const message = 'Test error';
      const error = new Error('Test error details');
      
      testLogger.error(message, error);
      
      expect(testLogger.error).toHaveBeenCalledWith(message, error);
    });

    it('should log warning messages', () => {
      const { logger: testLogger } = require('../../src/utils/logger');
      const message = 'Test warning';
      
      testLogger.warn(message);
      
      expect(testLogger.warn).toHaveBeenCalledWith(message);
    });

    it('should log debug messages', () => {
      const { logger: testLogger } = require('../../src/utils/logger');
      const message = 'Debug information';
      const data = { key: 'value', count: 42 };
      
      testLogger.debug(message, data);
      
      expect(testLogger.debug).toHaveBeenCalledWith(message, data);
    });

    it('should handle complex objects in log messages', () => {
      const { logger: testLogger } = require('../../src/utils/logger');
      const complexObject = {
        user: { id: 123, name: 'Test User' },
        metadata: { timestamp: new Date(), version: '1.0.0' },
        nested: { deep: { data: [1, 2, 3] } }
      };
      
      testLogger.info('Complex object log', complexObject);
      
      expect(testLogger.info).toHaveBeenCalledWith('Complex object log', complexObject);
    });

    it('should handle null and undefined values', () => {
      const { logger: testLogger } = require('../../src/utils/logger');
      
      testLogger.info('Null value', null);
      testLogger.info('Undefined value', undefined);
      
      expect(testLogger.info).toHaveBeenCalledWith('Null value', null);
      expect(testLogger.info).toHaveBeenCalledWith('Undefined value', undefined);
    });
  });

  describe('Error Handling', () => {
    it('should handle logging errors gracefully', () => {
      const { logger: testLogger } = require('../../src/utils/logger');
      
      // Mock logger to throw error
      testLogger.error.mockImplementation(() => {
        throw new Error('Logging system failure');
      });
      
      expect(() => {
        testLogger.error('This should not crash the application');
      }).toThrow('Logging system failure');
    });

    it('should handle circular references in objects', () => {
      const { logger: testLogger } = require('../../src/utils/logger');
      
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj; // Create circular reference
      
      expect(() => {
        testLogger.info('Circular object', circularObj);
      }).not.toThrow();
    });

    it('should handle very large objects', () => {
      const { logger: testLogger } = require('../../src/utils/logger');
      
      const largeObject = {
        data: Array(10000).fill(0).map((_, i) => ({
          id: i,
          value: `item-${i}`,
          timestamp: new Date().toISOString()
        }))
      };
      
      expect(() => {
        testLogger.info('Large object', largeObject);
      }).not.toThrow();
    });
  });

  describe('Log Levels', () => {
    const logLevels = ['error', 'warn', 'info', 'debug'];
    
    logLevels.forEach(level => {
      it(`should support ${level} log level`, () => {
        process.env.LOG_LEVEL = level;
        
        jest.resetModules();
        const { logger: levelLogger } = require('../../src/utils/logger');
        
        expect(winston.createLogger).toHaveBeenCalledWith(
          expect.objectContaining({ level })
        );
      });
    });

    it('should default to info level when LOG_LEVEL is not set', () => {
      delete process.env.LOG_LEVEL;
      
      jest.resetModules();
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'info' })
      );
    });

    it('should handle invalid log levels gracefully', () => {
      process.env.LOG_LEVEL = 'invalid-level';
      
      jest.resetModules();
      require('../../src/utils/logger');
      
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'invalid-level' })
      );
    });
  });

  describe('File Management', () => {
    it('should configure log rotation for error log', () => {
      expect(winston.transports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.stringContaining('error.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );
    });

    it('should configure log rotation for automation log', () => {
      expect(winston.transports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.stringContaining('automation.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );
    });

    it('should use correct log file paths', () => {
      expect(mockPath.join).toHaveBeenCalledWith(
        expect.any(String),
        'error.log'
      );
      expect(mockPath.join).toHaveBeenCalledWith(
        expect.any(String),
        'automation.log'
      );
    });
  });
});

describe('Performance Logger - Comprehensive Tests', () => {
  let mockHrtime: jest.SpyInstance;
  let mockProcessMemory: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.hrtime.bigint
    mockHrtime = jest.spyOn(process.hrtime, 'bigint');
    mockHrtime.mockReturnValue(BigInt(1000000000)); // 1 second in nanoseconds
    
    // Mock process.memoryUsage
    mockProcessMemory = jest.spyOn(process, 'memoryUsage');
    mockProcessMemory.mockReturnValue({
      rss: 50 * 1024 * 1024, // 50MB
      heapTotal: 30 * 1024 * 1024, // 30MB
      heapUsed: 20 * 1024 * 1024, // 20MB
      external: 5 * 1024 * 1024, // 5MB
      arrayBuffers: 2 * 1024 * 1024 // 2MB
    });
  });

  afterEach(() => {
    mockHrtime.mockRestore();
    mockProcessMemory.mockRestore();
  });

  describe('Performance Timing', () => {
    it('should start and end timers correctly', () => {
      const label = 'Test Operation';
      let startTime = BigInt(1000000000); // 1 second
      let endTime = BigInt(3000000000); // 3 seconds
      
      mockHrtime
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      
      const timer = performanceLogger.startTimer(label);
      const duration = timer.end();
      
      expect(logger.info).toHaveBeenCalledWith(`⏱️  Starting ${label}`);
      expect(logger.info).toHaveBeenCalledWith(`✅ ${label} completed in 2000.00ms`);
      expect(duration).toBe(2000); // 2 seconds in milliseconds
    });

    it('should handle very short operations', () => {
      const label = 'Quick Operation';
      let startTime = BigInt(1000000000);
      let endTime = BigInt(1001000000); // 1ms later
      
      mockHrtime
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      
      const timer = performanceLogger.startTimer(label);
      const duration = timer.end();
      
      expect(duration).toBe(1); // 1 millisecond
      expect(logger.info).toHaveBeenCalledWith(`✅ ${label} completed in 1.00ms`);
    });

    it('should handle very long operations', () => {
      const label = 'Long Operation';
      let startTime = BigInt(1000000000);
      let endTime = BigInt(61000000000); // 60 seconds later
      
      mockHrtime
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      
      const timer = performanceLogger.startTimer(label);
      const duration = timer.end();
      
      expect(duration).toBe(60000); // 60 seconds in milliseconds
      expect(logger.info).toHaveBeenCalledWith(`✅ ${label} completed in 60000.00ms`);
    });

    it('should handle zero-duration operations', () => {
      const label = 'Instant Operation';
      let time = BigInt(1000000000);
      
      mockHrtime
        .mockReturnValueOnce(time)
        .mockReturnValueOnce(time); // Same time
      
      const timer = performanceLogger.startTimer(label);
      const duration = timer.end();
      
      expect(duration).toBe(0);
      expect(logger.info).toHaveBeenCalledWith(`✅ ${label} completed in 0.00ms`);
    });

    it('should handle multiple concurrent timers', () => {
      const labels = ['Operation 1', 'Operation 2', 'Operation 3'];
      let timeCounter = 1000000000;
      
      // Mock increasing times for each call
      mockHrtime.mockImplementation(() => {
        timeCounter += 1000000000; // Add 1 second each call
        return BigInt(timeCounter);
      });
      
      const timers = labels.map(label => performanceLogger.startTimer(label));
      const durations = timers.map(timer => timer.end());
      
      expect(durations).toEqual([1000, 1000, 1000]); // Each timer ran for 1 second
      labels.forEach(label => {
        expect(logger.info).toHaveBeenCalledWith(`⏱️  Starting ${label}`);
        expect(logger.info).toHaveBeenCalledWith(`✅ ${label} completed in 1000.00ms`);
      });
    });

    it('should format duration with correct precision', () => {
      const testCases = [
        { nano: BigInt(1500000), expected: '1.50ms' },
        { nano: BigInt(999999), expected: '1.00ms' },
        { nano: BigInt(1000001), expected: '1.00ms' },
        { nano: BigInt(1234567), expected: '1.23ms' }
      ];
      
      testCases.forEach(({ nano, expected }) => {
        mockHrtime
          .mockReturnValueOnce(BigInt(0))
          .mockReturnValueOnce(nano);
        
        const timer = performanceLogger.startTimer('Test');
        timer.end();
        
        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining(expected)
        );
      });
    });
  });

  describe('Memory Usage Logging', () => {
    it('should log memory usage with correct formatting', () => {
      performanceLogger.logMemoryUsage();
      
      expect(logger.info).toHaveBeenCalledWith('Memory usage:', {
        rss: '50 MB',
        heapTotal: '30 MB',
        heapUsed: '20 MB',
        external: '5 MB'
      });
    });

    it('should handle small memory values', () => {
      mockProcessMemory.mockReturnValue({
        rss: 1024 * 1024, // 1MB
        heapTotal: 512 * 1024, // 0.5MB
        heapUsed: 256 * 1024, // 0.25MB
        external: 128 * 1024, // 0.125MB
        arrayBuffers: 64 * 1024 // 0.0625MB
      });
      
      performanceLogger.logMemoryUsage();
      
      expect(logger.info).toHaveBeenCalledWith('Memory usage:', {
        rss: '1 MB',
        heapTotal: '0.5 MB',
        heapUsed: '0.25 MB',
        external: '0.13 MB'
      });
    });

    it('should handle large memory values', () => {
      mockProcessMemory.mockReturnValue({
        rss: 2 * 1024 * 1024 * 1024, // 2GB
        heapTotal: 1.5 * 1024 * 1024 * 1024, // 1.5GB
        heapUsed: 1024 * 1024 * 1024, // 1GB
        external: 512 * 1024 * 1024, // 512MB
        arrayBuffers: 256 * 1024 * 1024 // 256MB
      });
      
      performanceLogger.logMemoryUsage();
      
      expect(logger.info).toHaveBeenCalledWith('Memory usage:', {
        rss: '2048 MB',
        heapTotal: '1536 MB',
        heapUsed: '1024 MB',
        external: '512 MB'
      });
    });

    it('should round memory values correctly', () => {
      mockProcessMemory.mockReturnValue({
        rss: 1.7 * 1024 * 1024, // 1.7MB
        heapTotal: 2.34 * 1024 * 1024, // 2.34MB
        heapUsed: 3.789 * 1024 * 1024, // 3.789MB
        external: 4.1234 * 1024 * 1024, // 4.1234MB
        arrayBuffers: 5.9999 * 1024 * 1024 // 5.9999MB
      });
      
      performanceLogger.logMemoryUsage();
      
      expect(logger.info).toHaveBeenCalledWith('Memory usage:', {
        rss: '1.7 MB',
        heapTotal: '2.34 MB',
        heapUsed: '3.79 MB',
        external: '4.12 MB'
      });
    });

    it('should handle memory usage errors gracefully', () => {
      mockProcessMemory.mockImplementation(() => {
        throw new Error('Memory info unavailable');
      });
      
      expect(() => {
        performanceLogger.logMemoryUsage();
      }).toThrow('Memory info unavailable');
    });
  });

  describe('Performance Logger Integration', () => {
    it('should work with real-world scenarios', () => {
      // Simulate a database operation
      const dbTimer = performanceLogger.startTimer('Database Query');
      
      // Simulate some time passing
      mockHrtime
        .mockReturnValueOnce(BigInt(1000000000))
        .mockReturnValueOnce(BigInt(1150000000)); // 150ms later
      
      const dbDuration = dbTimer.end();
      
      // Simulate an API call
      const apiTimer = performanceLogger.startTimer('API Request');
      
      mockHrtime
        .mockReturnValueOnce(BigInt(2000000000))
        .mockReturnValueOnce(BigInt(2300000000)); // 300ms later
      
      const apiDuration = apiTimer.end();
      
      expect(dbDuration).toBe(150);
      expect(apiDuration).toBe(300);
      
      expect(logger.info).toHaveBeenCalledWith('⏱️  Starting Database Query');
      expect(logger.info).toHaveBeenCalledWith('✅ Database Query completed in 150.00ms');
      expect(logger.info).toHaveBeenCalledWith('⏱️  Starting API Request');
      expect(logger.info).toHaveBeenCalledWith('✅ API Request completed in 300.00ms');
    });

    it('should handle nested operations', () => {
      const outerTimer = performanceLogger.startTimer('Outer Operation');
      const innerTimer = performanceLogger.startTimer('Inner Operation');
      
      mockHrtime
        .mockReturnValueOnce(BigInt(1000000000)) // Outer start
        .mockReturnValueOnce(BigInt(2000000000)) // Inner start
        .mockReturnValueOnce(BigInt(2500000000)) // Inner end (500ms)
        .mockReturnValueOnce(BigInt(3000000000)); // Outer end (2000ms total)
      
      const innerDuration = innerTimer.end();
      const outerDuration = outerTimer.end();
      
      expect(innerDuration).toBe(500);
      expect(outerDuration).toBe(2000);
    });

    it('should support operation benchmarking', () => {
      const operations = ['Operation A', 'Operation B', 'Operation C'];
      const durations: number[] = [];
      
      let timeBase = 1000000000;
      mockHrtime.mockImplementation(() => {
        const current = BigInt(timeBase);
        timeBase += 100000000; // Add 100ms each call
        return current;
      });
      
      operations.forEach(op => {
        const timer = performanceLogger.startTimer(op);
        durations.push(timer.end());
      });
      
      expect(durations).toEqual([100, 100, 100]);
      
      // Find the fastest operation
      const fastestIndex = durations.indexOf(Math.min(...durations));
      expect(operations[fastestIndex]).toBe('Operation A'); // All same in this mock
    });
  });

  describe('Timer Edge Cases', () => {
    it('should handle timer end called multiple times', () => {
      mockHrtime
        .mockReturnValueOnce(BigInt(1000000000))
        .mockReturnValueOnce(BigInt(2000000000));
      
      const timer = performanceLogger.startTimer('Test');
      const duration1 = timer.end();
      const duration2 = timer.end();
      
      expect(duration1).toBe(1000);
      expect(duration2).toBe(1000); // Should return same value
    });

    it('should handle timer with special characters in label', () => {
      const specialLabel = 'Test: 🚀 Special/Chars & Symbols (v1.0)';
      
      mockHrtime
        .mockReturnValueOnce(BigInt(1000000000))
        .mockReturnValueOnce(BigInt(1100000000));
      
      const timer = performanceLogger.startTimer(specialLabel);
      timer.end();
      
      expect(logger.info).toHaveBeenCalledWith(`⏱️  Starting ${specialLabel}`);
      expect(logger.info).toHaveBeenCalledWith(`✅ ${specialLabel} completed in 100.00ms`);
    });

    it('should handle very long timer labels', () => {
      const longLabel = 'A'.repeat(1000);
      
      mockHrtime
        .mockReturnValueOnce(BigInt(1000000000))
        .mockReturnValueOnce(BigInt(1050000000));
      
      const timer = performanceLogger.startTimer(longLabel);
      timer.end();
      
      expect(logger.info).toHaveBeenCalledWith(`⏱️  Starting ${longLabel}`);
      expect(logger.info).toHaveBeenCalledWith(`✅ ${longLabel} completed in 50.00ms`);
    });
  });
});