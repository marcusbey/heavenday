import { SheetsClient } from '../sheets/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { SupportTicket, SupportStatus, SupportPriority, SupportCategory, SyncResult } from '../types';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';

export class SupportTracker {
  private sheetsClient: SheetsClient;
  private supportSpreadsheetId: string;

  constructor() {
    this.sheetsClient = new SheetsClient();
    this.supportSpreadsheetId = config.spreadsheets.support;
  }

  async createTicket(ticketData: {
    customerId: string;
    customerEmail: string;
    customerName: string;
    subject: string;
    description: string;
    category: SupportCategory;
    priority: SupportPriority;
    orderId?: string;
    tags?: string[];
  }): Promise<string> {
    try {
      const ticketId = this.generateTicketId();
      
      const ticket: SupportTicket = {
        id: ticketId,
        ...ticketData,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info('Creating support ticket', { ticketId, customerId: ticket.customerId });

      await this.addTicket(ticket);
      await this.trackTicketUpdate(ticketId, 'create', null, 'open', 'System', 'Ticket created');

      logger.info('Support ticket created successfully', { ticketId });
      return ticketId;
    } catch (error) {
      logger.error('Error creating support ticket', { error, ticketData });
      throw error;
    }
  }

  async updateTicketStatus(
    ticketId: string, 
    newStatus: SupportStatus, 
    updatedBy: string,
    message?: string,
    assignedTo?: string
  ): Promise<void> {
    try {
      logger.info('Updating ticket status', { ticketId, newStatus });

      const ticket = await this.getTicketById(ticketId);
      if (!ticket) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      const previousStatus = ticket.status;
      const now = new Date();

      // Update ticket
      const updatedTicket: SupportTicket = {
        ...ticket,
        status: newStatus,
        updatedAt: now,
        ...(assignedTo && { assignedTo }),
        ...(newStatus === 'resolved' && !ticket.resolvedAt && { resolvedAt: now }),
        ...(newStatus === 'in_progress' && !ticket.firstResponseAt && { firstResponseAt: now })
      };

      // Calculate response and resolution times
      if (updatedTicket.firstResponseAt && !ticket.firstResponseAt) {
        updatedTicket.responseTime = differenceInMinutes(updatedTicket.firstResponseAt, ticket.createdAt);
      }

      if (updatedTicket.resolvedAt && !ticket.resolvedAt) {
        updatedTicket.resolutionTime = differenceInMinutes(updatedTicket.resolvedAt, ticket.createdAt);
      }

      await this.updateTicket(updatedTicket);
      await this.trackTicketUpdate(ticketId, 'status_change', previousStatus, newStatus, updatedBy, message);

      logger.info('Ticket status updated successfully', { ticketId, previousStatus, newStatus });
    } catch (error) {
      logger.error('Error updating ticket status', { error, ticketId, newStatus });
      throw error;
    }
  }

  async assignTicket(ticketId: string, assignedTo: string, assignedBy: string): Promise<void> {
    try {
      logger.info('Assigning ticket', { ticketId, assignedTo });

      const ticket = await this.getTicketById(ticketId);
      if (!ticket) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      const updatedTicket: SupportTicket = {
        ...ticket,
        assignedTo,
        status: ticket.status === 'open' ? 'in_progress' : ticket.status,
        updatedAt: new Date()
      };

      await this.updateTicket(updatedTicket);
      await this.trackTicketUpdate(
        ticketId, 
        'assign', 
        ticket.status, 
        updatedTicket.status, 
        assignedBy,
        `Ticket assigned to ${assignedTo}`
      );

      logger.info('Ticket assigned successfully', { ticketId, assignedTo });
    } catch (error) {
      logger.error('Error assigning ticket', { error, ticketId, assignedTo });
      throw error;
    }
  }

  async addCustomerSatisfactionScore(
    ticketId: string, 
    score: number, 
    feedback?: string
  ): Promise<void> {
    try {
      logger.info('Adding satisfaction score', { ticketId, score });

      const ticket = await this.getTicketById(ticketId);
      if (!ticket) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      const updatedTicket: SupportTicket = {
        ...ticket,
        satisfactionScore: score,
        updatedAt: new Date()
      };

      await this.updateTicket(updatedTicket);
      await this.trackTicketUpdate(
        ticketId, 
        'satisfaction', 
        null, 
        null, 
        'Customer',
        `Satisfaction score: ${score}/5${feedback ? ` - ${feedback}` : ''}`
      );

      logger.info('Satisfaction score added successfully', { ticketId, score });
    } catch (error) {
      logger.error('Error adding satisfaction score', { error, ticketId, score });
      throw error;
    }
  }

  async updateAgentPerformance(date: Date = new Date()): Promise<void> {
    try {
      logger.info('Updating agent performance metrics', { date });

      const dateStr = format(date, 'yyyy-MM-dd');
      const agents = await this.getAgentActivity(dateStr);

      // Clear existing data for the date
      await this.clearAgentPerformanceForDate(dateStr);

      // Add updated performance data
      const performanceRows = agents.map(agent => [
        agent.name,
        agent.email,
        dateStr,
        agent.ticketsAssigned,
        agent.ticketsResolved,
        agent.averageResponseTime.toFixed(2),
        agent.averageResolutionTime.toFixed(2),
        agent.satisfactionScore.toFixed(2),
        agent.escalatedTickets,
        agent.activeTickets
      ]);

      if (performanceRows.length > 0) {
        await this.sheetsClient.appendRows(
          this.supportSpreadsheetId,
          'Agent Performance',
          performanceRows
        );
      }

      logger.info('Agent performance updated successfully');
    } catch (error) {
      logger.error('Error updating agent performance', { error });
      throw error;
    }
  }

  async updateCategoryAnalysis(date: Date = new Date()): Promise<void> {
    try {
      logger.info('Updating category analysis', { date });

      const dateStr = format(date, 'yyyy-MM-dd');
      const categories = await this.getCategoryMetrics(dateStr);

      // Clear existing data for the date
      await this.clearCategoryAnalysisForDate(dateStr);

      // Add updated category analysis
      const categoryRows = categories.map(category => [
        category.name,
        dateStr,
        category.ticketsCreated,
        category.ticketsResolved,
        category.averageResolutionTime.toFixed(2),
        category.satisfactionScore.toFixed(2),
        category.escalationRate.toFixed(2),
        category.commonIssues.join('; ')
      ]);

      if (categoryRows.length > 0) {
        await this.sheetsClient.appendRows(
          this.supportSpreadsheetId,
          'Category Analysis',
          categoryRows
        );
      }

      logger.info('Category analysis updated successfully');
    } catch (error) {
      logger.error('Error updating category analysis', { error });
      throw error;
    }
  }

  async updateDailyMetrics(date: Date = new Date()): Promise<void> {
    try {
      logger.info('Updating daily support metrics', { date });

      const dateStr = format(date, 'yyyy-MM-dd');
      const metrics = await this.calculateDailyMetrics(dateStr);

      const metricsRow = [
        dateStr,
        metrics.ticketsCreated,
        metrics.ticketsResolved,
        metrics.ticketsPending,
        metrics.averageResponseTime.toFixed(2),
        metrics.averageResolutionTime.toFixed(2),
        metrics.customerSatisfactionScore.toFixed(2),
        metrics.slaCompliance.toFixed(2),
        metrics.escalationRate.toFixed(2)
      ];

      // Update or add daily metrics
      const existing = await this.sheetsClient.findAndUpdateRow(
        this.supportSpreadsheetId,
        'Daily Metrics',
        0, // Search in Date column
        dateStr,
        metricsRow
      );

      if (!existing) {
        await this.sheetsClient.appendRows(
          this.supportSpreadsheetId,
          'Daily Metrics',
          [metricsRow]
        );
      }

      logger.info('Daily metrics updated successfully');
    } catch (error) {
      logger.error('Error updating daily metrics', { error });
      throw error;
    }
  }

  async syncSupportData(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      errors: [],
      timestamp: new Date()
    };

    try {
      logger.info('Starting support data sync');

      // Update agent performance
      await this.updateAgentPerformance();
      result.recordsProcessed++;

      // Update category analysis
      await this.updateCategoryAnalysis();
      result.recordsProcessed++;

      // Update daily metrics
      await this.updateDailyMetrics();
      result.recordsProcessed++;

      result.recordsAdded = result.recordsProcessed;
      result.success = true;

      logger.info('Support data sync completed', result);
      return result;
    } catch (error) {
      const errorMessage = `Error during support sync: ${error}`;
      result.errors.push(errorMessage);
      logger.error(errorMessage, { error });
      return result;
    }
  }

  private async addTicket(ticket: SupportTicket): Promise<void> {
    const ticketRow = this.ticketToSheetRow(ticket);
    await this.sheetsClient.appendRows(
      this.supportSpreadsheetId,
      'Support Tickets',
      [ticketRow]
    );
  }

  private async updateTicket(ticket: SupportTicket): Promise<void> {
    const ticketRow = this.ticketToSheetRow(ticket);
    const updated = await this.sheetsClient.findAndUpdateRow(
      this.supportSpreadsheetId,
      'Support Tickets',
      0, // Search in Ticket ID column
      ticket.id,
      ticketRow
    );

    if (!updated) {
      // If not found, add as new ticket
      await this.addTicket(ticket);
    }
  }

  private async getTicketById(ticketId: string): Promise<SupportTicket | null> {
    try {
      const values = await this.sheetsClient.getValues(
        this.supportSpreadsheetId,
        'Support Tickets!A:T'
      );
      
      const ticketRow = values.find(row => row[0] === ticketId);
      if (!ticketRow) return null;
      
      return this.sheetRowToTicket(ticketRow);
    } catch (error) {
      logger.error('Error getting ticket by ID', { error, ticketId });
      return null;
    }
  }

  private async trackTicketUpdate(
    ticketId: string,
    updateType: string,
    previousStatus: SupportStatus | null,
    newStatus: SupportStatus | null,
    updatedBy: string,
    message?: string,
    customerVisible: boolean = true
  ): Promise<void> {
    const updateRow = [
      ticketId,
      updateType,
      previousStatus || '',
      newStatus || '',
      updatedBy,
      format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      message || '',
      '', // Internal note
      customerVisible ? 'Yes' : 'No'
    ];

    await this.sheetsClient.appendRows(
      this.supportSpreadsheetId,
      'Ticket Updates',
      [updateRow]
    );
  }

  private async getAgentActivity(date: string): Promise<any[]> {
    try {
      // This would analyze ticket data to calculate agent performance
      // For now, return empty array - implement based on your data structure
      return [];
    } catch (error) {
      logger.error('Error getting agent activity', { error, date });
      return [];
    }
  }

  private async getCategoryMetrics(date: string): Promise<any[]> {
    try {
      // This would analyze ticket data by category
      // For now, return empty array - implement based on your data structure
      return [];
    } catch (error) {
      logger.error('Error getting category metrics', { error, date });
      return [];
    }
  }

  private async calculateDailyMetrics(date: string): Promise<any> {
    try {
      const tickets = await this.getTicketsForDate(date);
      
      const ticketsCreated = tickets.filter(t => 
        format(t.createdAt, 'yyyy-MM-dd') === date
      ).length;

      const ticketsResolved = tickets.filter(t => 
        t.resolvedAt && format(t.resolvedAt, 'yyyy-MM-dd') === date
      ).length;

      const ticketsPending = tickets.filter(t => 
        t.status === 'open' || t.status === 'in_progress'
      ).length;

      const responseTimes = tickets
        .filter(t => t.responseTime !== undefined)
        .map(t => t.responseTime!);
      
      const resolutionTimes = tickets
        .filter(t => t.resolutionTime !== undefined)
        .map(t => t.resolutionTime!);

      const satisfactionScores = tickets
        .filter(t => t.satisfactionScore !== undefined)
        .map(t => t.satisfactionScore!);

      return {
        ticketsCreated,
        ticketsResolved,
        ticketsPending,
        averageResponseTime: responseTimes.length > 0 
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
        averageResolutionTime: resolutionTimes.length > 0 
          ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0,
        customerSatisfactionScore: satisfactionScores.length > 0 
          ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length : 0,
        slaCompliance: this.calculateSLACompliance(tickets),
        escalationRate: this.calculateEscalationRate(tickets)
      };
    } catch (error) {
      logger.error('Error calculating daily metrics', { error, date });
      return {
        ticketsCreated: 0,
        ticketsResolved: 0,
        ticketsPending: 0,
        averageResponseTime: 0,
        averageResolutionTime: 0,
        customerSatisfactionScore: 0,
        slaCompliance: 0,
        escalationRate: 0
      };
    }
  }

  private async getTicketsForDate(date: string): Promise<SupportTicket[]> {
    try {
      const values = await this.sheetsClient.getValues(
        this.supportSpreadsheetId,
        'Support Tickets!A:T'
      );
      
      return values
        .filter(row => {
          const createdAt = new Date(row[11]); // Created At column
          return format(createdAt, 'yyyy-MM-dd') === date;
        })
        .map(row => this.sheetRowToTicket(row));
    } catch (error) {
      logger.error('Error getting tickets for date', { error, date });
      return [];
    }
  }

  private async clearAgentPerformanceForDate(date: string): Promise<void> {
    // This would clear existing agent performance data for the specified date
    // Implementation depends on your specific requirements
  }

  private async clearCategoryAnalysisForDate(date: string): Promise<void> {
    // This would clear existing category analysis data for the specified date
    // Implementation depends on your specific requirements
  }

  private calculateSLACompliance(tickets: SupportTicket[]): number {
    // Define SLA thresholds (in minutes)
    const SLA_THRESHOLDS = {
      urgent: 60,    // 1 hour
      high: 240,     // 4 hours
      medium: 480,   // 8 hours
      low: 1440      // 24 hours
    };

    const slaTickets = tickets.filter(t => t.responseTime !== undefined);
    if (slaTickets.length === 0) return 100;

    const compliantTickets = slaTickets.filter(ticket => {
      const threshold = SLA_THRESHOLDS[ticket.priority];
      return ticket.responseTime! <= threshold;
    }).length;

    return (compliantTickets / slaTickets.length) * 100;
  }

  private calculateEscalationRate(tickets: SupportTicket[]): number {
    if (tickets.length === 0) return 0;
    
    const escalatedTickets = tickets.filter(t => 
      t.tags?.includes('escalated') || t.priority === 'urgent'
    ).length;

    return (escalatedTickets / tickets.length) * 100;
  }

  private generateTicketId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 7);
    return `TICK-${timestamp}-${randomStr}`.toUpperCase();
  }

  private ticketToSheetRow(ticket: SupportTicket): any[] {
    return [
      ticket.id,
      ticket.customerId,
      ticket.customerName,
      ticket.customerEmail,
      ticket.subject,
      ticket.description,
      ticket.category,
      ticket.priority,
      ticket.status,
      ticket.assignedTo || '',
      ticket.orderId || '',
      format(ticket.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      format(ticket.updatedAt, 'yyyy-MM-dd HH:mm:ss'),
      ticket.firstResponseAt ? format(ticket.firstResponseAt, 'yyyy-MM-dd HH:mm:ss') : '',
      ticket.resolvedAt ? format(ticket.resolvedAt, 'yyyy-MM-dd HH:mm:ss') : '',
      ticket.responseTime || '',
      ticket.resolutionTime || '',
      ticket.satisfactionScore || '',
      ticket.tags?.join(', ') || '',
      ''  // Notes
    ];
  }

  private sheetRowToTicket(row: any[]): SupportTicket {
    return {
      id: row[0],
      customerId: row[1],
      customerName: row[2],
      customerEmail: row[3],
      subject: row[4],
      description: row[5],
      category: row[6] as SupportCategory,
      priority: row[7] as SupportPriority,
      status: row[8] as SupportStatus,
      assignedTo: row[9] || undefined,
      orderId: row[10] || undefined,
      createdAt: new Date(row[11]),
      updatedAt: new Date(row[12]),
      firstResponseAt: row[13] ? new Date(row[13]) : undefined,
      resolvedAt: row[14] ? new Date(row[14]) : undefined,
      responseTime: row[15] ? parseInt(row[15]) : undefined,
      resolutionTime: row[16] ? parseInt(row[16]) : undefined,
      satisfactionScore: row[17] ? parseInt(row[17]) : undefined,
      tags: row[18] ? row[18].split(', ') : undefined
    };
  }
}