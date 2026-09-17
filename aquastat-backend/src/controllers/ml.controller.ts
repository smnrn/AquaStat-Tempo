/**
 * @file src/controllers/ml.controller.ts
 * @description Controller exposing Three-Tier Analytics (Predictive models & Prescriptive optimization).
 */

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { mlService } from '../services/ml.service';
import { logger } from '../utils/logger';

export class MLController {
  
  public getSarimaxForecast = async (req: Request, res: Response): Promise<void> => {
    try {
      const { zoneId } = req.params;
      const forecast = await mlService.getSarimaxForecast(zoneId || 'Zone 1');
      res.status(StatusCodes.OK).json({ success: true, data: forecast });
    } catch (error) {
      this.handleMlError(error, res);
    }
  };

  public getLstmForecast = async (req: Request, res: Response): Promise<void> => {
    try {
      const { zoneId } = req.params;
      const forecast = await mlService.getLstmForecast(zoneId || 'Zone 1');
      res.status(StatusCodes.OK).json({ success: true, data: forecast });
    } catch (error) {
      this.handleMlError(error, res);
    }
  };

  public getProphetForecast = async (req: Request, res: Response): Promise<void> => {
    try {
      const { zoneId } = req.params;
      const forecast = await mlService.getProphetForecast(zoneId || 'Zone 1');
      res.status(StatusCodes.OK).json({ success: true, data: forecast });
    } catch (error) {
      this.handleMlError(error, res);
    }
  };

  public getXGBoostForecast = async (req: Request, res: Response): Promise<void> => {
    try {
      const { zoneId } = req.params;
      const forecast = await mlService.getXGBoostForecast(zoneId || 'Zone 1');
      res.status(StatusCodes.OK).json({ success: true, data: forecast });
    } catch (error) {
      this.handleMlError(error, res);
    }
  };

  public getPumpSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
      const rawBlocks = (req.body as { demandBlocks?: unknown })?.demandBlocks;
      const demandBlocks = Array.isArray(rawBlocks)
        ? (rawBlocks as number[]).map(Number)
        : undefined;
      const result = await mlService.getPumpScheduleOptimization(demandBlocks);
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      this.handleMlError(error, res);
    }
  };


  public getMCDARankings = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await mlService.getMCDAZoneRankings();
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      this.handleMlError(error, res);
    }
  };

  public getFPGrowthPatterns = async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await mlService.getFPGrowthPatterns();
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      this.handleMlError(error, res);
    }
  };

  private handleMlError(error: unknown, res: Response): void {
    if (error instanceof Error && error.message === 'ML_SERVICE_UNAVAILABLE') {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        success: false,
        error: 'Machine Learning engine is currently offline or unreachable.'
      });
    } else {
      logger.error('[ML Controller] Unexpected internal error', { error });
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'An internal server error occurred while processing analytics request.'
      });
    }
  }
}

export const mlController = new MLController();
