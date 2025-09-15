import { NextRequest, NextResponse } from 'next/server'
import { backtestingEngine } from '@/lib/backtesting'

interface BacktestRequest {
  symbol: string
  strategy: string
  startDate: string
  endDate: string
  initialCapital: number
  parameters?: any
}

interface OptimizationRequest {
  symbol: string
  strategy: string
  startDate: string
  endDate: string
  initialCapital: number
  parameterRanges: any
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    if (action === 'run') {
      const backtestData: BacktestRequest = data
      
      // Validate required fields
      if (!backtestData.symbol || !backtestData.strategy || !backtestData.startDate || !backtestData.endDate) {
        return NextResponse.json({ error: 'Missing required fields for backtest' }, { status: 400 })
      }

      const result = await backtestingEngine.runBacktest(backtestData)

      return NextResponse.json({
        action: 'run',
        result,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'optimize') {
      const optimizationData: OptimizationRequest = data
      
      if (!optimizationData.symbol || !optimizationData.strategy || !optimizationData.parameterRanges) {
        return NextResponse.json({ error: 'Missing required fields for optimization' }, { status: 400 })
      }

      const results = await backtestingEngine.optimizeStrategy(optimizationData, optimizationData.parameterRanges)

      return NextResponse.json({
        action: 'optimize',
        results,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'report') {
      if (!data.result) {
        return NextResponse.json({ error: 'Backtest result required for report generation' }, { status: 400 })
      }

      const report = backtestingEngine.generateBacktestReport(data.result)

      return NextResponse.json({
        action: 'report',
        report,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in backtesting API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (symbol) {
      // Get historical data for specific symbol
      const historicalData = backtestingEngine.getHistoricalData(symbol)
      if (!historicalData) {
        return NextResponse.json({ error: 'Symbol not found' }, { status: 404 })
      }

      return NextResponse.json({
        symbol,
        historicalData,
        dataPoints: historicalData.length,
        timestamp: new Date().toISOString()
      })
    }

    // Get available symbols
    const availableSymbols = backtestingEngine.getAvailableSymbols()

    return NextResponse.json({
      availableSymbols,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching backtest data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}