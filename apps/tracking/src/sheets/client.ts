import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from 'googleapis';
import { config } from '../config';
import { logger } from '../utils/logger';

export class SheetsClient {
  private sheets: sheets_v4.Sheets;
  private auth: GoogleAuth;

  constructor() {
    this.auth = new GoogleAuth({
      credentials: {
        client_email: config.googleSheets.clientEmail,
        private_key: config.googleSheets.privateKey,
        project_id: config.googleSheets.projectId
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ]
    });

    this.sheets = new sheets_v4.Sheets({ auth: this.auth });
  }

  async createSpreadsheet(title: string, sheets: { title: string; headers: string[] }[]): Promise<string> {
    try {
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title,
            locale: 'en_US',
            autoRecalc: 'ON_CHANGE',
            timeZone: 'America/New_York'
          },
          sheets: sheets.map((sheet, index) => ({
            properties: {
              title: sheet.title,
              sheetId: index,
              gridProperties: {
                rowCount: 1000,
                columnCount: sheet.headers.length + 2,
                frozenRowCount: 1
              }
            }
          }))
        }
      });

      const spreadsheetId = response.data.spreadsheetId!;
      logger.info(`Created spreadsheet: ${title}`, { spreadsheetId });

      // Add headers to each sheet
      for (let i = 0; i < sheets.length; i++) {
        await this.updateRange(
          spreadsheetId,
          `${sheets[i].title}!A1:${this.columnNumberToLetter(sheets[i].headers.length)}1`,
          [sheets[i].headers]
        );
      }

      // Format headers
      await this.formatHeaders(spreadsheetId, sheets);

      return spreadsheetId;
    } catch (error) {
      logger.error('Error creating spreadsheet', { error, title });
      throw error;
    }
  }

  async updateRange(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values
        }
      });
    } catch (error) {
      logger.error('Error updating range', { error, spreadsheetId, range });
      throw error;
    }
  }

  async appendRows(spreadsheetId: string, sheetName: string, values: any[][]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values
        }
      });
    } catch (error) {
      logger.error('Error appending rows', { error, spreadsheetId, sheetName });
      throw error;
    }
  }

  async getValues(spreadsheetId: string, range: string): Promise<any[][]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });
      return response.data.values || [];
    } catch (error) {
      logger.error('Error getting values', { error, spreadsheetId, range });
      throw error;
    }
  }

  async batchUpdate(spreadsheetId: string, requests: any[]): Promise<void> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests
        }
      });
    } catch (error) {
      logger.error('Error batch updating', { error, spreadsheetId });
      throw error;
    }
  }

  async clearRange(spreadsheetId: string, range: string): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range
      });
    } catch (error) {
      logger.error('Error clearing range', { error, spreadsheetId, range });
      throw error;
    }
  }

  async findAndUpdateRow(
    spreadsheetId: string, 
    sheetName: string, 
    searchColumn: number, 
    searchValue: string, 
    newValues: any[]
  ): Promise<boolean> {
    try {
      const values = await this.getValues(spreadsheetId, `${sheetName}!A:ZZ`);
      
      for (let i = 1; i < values.length; i++) { // Skip header row
        if (values[i][searchColumn] === searchValue) {
          const range = `${sheetName}!A${i + 1}:${this.columnNumberToLetter(newValues.length)}${i + 1}`;
          await this.updateRange(spreadsheetId, range, [newValues]);
          return true;
        }
      }
      
      return false; // Row not found
    } catch (error) {
      logger.error('Error finding and updating row', { error, spreadsheetId, sheetName, searchValue });
      throw error;
    }
  }

  private async formatHeaders(spreadsheetId: string, sheets: { title: string; headers: string[] }[]): Promise<void> {
    const requests = sheets.map((sheet, sheetIndex) => ({
      repeatCell: {
        range: {
          sheetId: sheetIndex,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: sheet.headers.length
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.2, green: 0.2, blue: 0.8 },
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true
            },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    }));

    await this.batchUpdate(spreadsheetId, requests);
  }

  private columnNumberToLetter(columnNumber: number): string {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }

  async addConditionalFormatting(
    spreadsheetId: string, 
    sheetId: number, 
    range: { startRow: number; endRow: number; startColumn: number; endColumn: number },
    condition: any,
    format: any
  ): Promise<void> {
    try {
      const request = {
        addConditionalFormatRule: {
          rule: {
            ranges: [{
              sheetId,
              startRowIndex: range.startRow,
              endRowIndex: range.endRow,
              startColumnIndex: range.startColumn,
              endColumnIndex: range.endColumn
            }],
            booleanRule: {
              condition,
              format
            }
          },
          index: 0
        }
      };

      await this.batchUpdate(spreadsheetId, [request]);
    } catch (error) {
      logger.error('Error adding conditional formatting', { error, spreadsheetId, sheetId });
      throw error;
    }
  }

  async createChart(
    spreadsheetId: string,
    sheetId: number,
    chartType: string,
    sourceRange: any,
    position: { overlayPosition: { anchorCell: any } }
  ): Promise<void> {
    try {
      const request = {
        addChart: {
          chart: {
            spec: {
              title: 'Auto-generated Chart',
              basicChart: {
                chartType,
                legendPosition: 'BOTTOM_LEGEND',
                axis: [
                  {
                    position: 'BOTTOM_AXIS',
                    title: 'Date'
                  },
                  {
                    position: 'LEFT_AXIS',
                    title: 'Value'
                  }
                ],
                domains: [sourceRange],
                series: [sourceRange]
              }
            },
            position
          }
        }
      };

      await this.batchUpdate(spreadsheetId, [request]);
    } catch (error) {
      logger.error('Error creating chart', { error, spreadsheetId, sheetId });
      throw error;
    }
  }
}