import { NextRequest, NextResponse } from 'next/server'
import { riskManagementService } from '@/lib/risk-management'

interface RiskAssessmentRequest {
  symbol: string
  action: 'buy' | 'sell'
  quantity: number
  entryPrice: number
  stopLoss?: number
  portfolio: {
    totalValue: number
    availableCash: number
    dailyPnL: number
    positions: Array<{
      symbol: string
      quantity: number
      entryPrice: number
      currentPrice: number
      unrealizedPnL: number
      type: 'long' | 'short'
    }>
  }
}

interface PositionSizeRequest {
  symbol: string
  entryPrice: number
  stopLoss: number
  portfolioValue: number
  riskTolerance?: number
}

interface StopLossRequest {
  symbol: string
  entryPrice: number
  action: 'buy' | 'sell'
  volatility?: number
  atr?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    if (action === 'assess') {
      const assessmentData: RiskAssessmentRequest = data
      const assessment = riskManagementService.assessTradeRisk(
        assessmentData.symbol,
        assessmentData.action,
        assessmentData.quantity,
        assessmentData.entryPrice,
        assessmentData.stopLoss,
        assessmentData.portfolio
      )

      return NextResponse.json({
        action: 'assess',
        assessment,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'position-size') {
      const sizeData: PositionSizeRequest = data
      const optimalSize = riskManagementService.calculateOptimalPositionSize(
        sizeData.symbol,
        sizeData.entryPrice,
        sizeData.stopLoss,
        sizeData.portfolioValue,
        sizeData.riskTolerance || 1
      )

      return NextResponse.json({
        action: 'position-size',
        optimalSize,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'stop-loss') {
      const stopData: StopLossRequest = data
      const levels = riskManagementService.generateStopLossLevels(
        stopData.symbol,
        stopData.entryPrice,
        stopData.action,
        stopData.volatility || 0.02,
        stopData.atr
      )

      return NextResponse.json({
        action: 'stop-loss',
        levels,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'portfolio-metrics') {
      const metrics = riskManagementService.calculatePortfolioMetrics(data)
      return NextResponse.json({
        action: 'portfolio-metrics',
        metrics,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'risk-report') {
      const report = riskManagementService.generateRiskReport(data)
      return NextResponse.json({
        action: 'risk-report',
        report,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in risk management API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const parameters = riskManagementService.getParameters()
    
    return NextResponse.json({
      parameters,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching risk parameters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    riskManagementService.updateParameters(body)
    
    return NextResponse.json({
      message: 'Risk parameters updated successfully',
      parameters: riskManagementService.getParameters(),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error updating risk parameters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}