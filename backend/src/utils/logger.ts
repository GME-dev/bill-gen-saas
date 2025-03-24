import winston from 'winston';

// Define your severity levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Create the format for the logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info: any) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use
const transports = [
  // Log to the console
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      format
    ),
  }),
  // Log to a file
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format,
  }),
  // Log all levels to another file
  new winston.transports.File({ 
    filename: 'logs/all.log',
    format,
  }),
];

// Get the log level from environment or use default
const level = process.env.LOG_LEVEL || 'info';

// Create the logger
export const logger = winston.createLogger({
  level,
  levels,
  transports,
});

// Export a simplified interface
export default {
  error: (message: string) => logger.error(message),
  warn: (message: string) => logger.warn(message),
  info: (message: string) => logger.info(message),
  http: (message: string) => logger.http(message),
  debug: (message: string) => logger.debug(message),
}; 