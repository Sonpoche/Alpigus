// lib/debug-logger.ts
import fs from 'fs/promises';
import path from 'path';

export async function logDebug(message: string, data?: any): Promise<void> {
  try {
    const logMessage = `[${new Date().toISOString()}] ${message} ${data ? JSON.stringify(data, null, 2) : ''}`;
    await fs.appendFile(
      path.join(process.cwd(), 'debug.log'), 
      logMessage + '\n'
    );
  } catch (error) {
    console.error('Erreur d\'écriture dans le fichier de log:', error);
  }
}