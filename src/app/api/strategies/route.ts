import { NextRequest, NextResponse } from 'next/server'
import { strategyManager } from '@/lib/trading-strategies'

interface StrategyRequest {
  symbol: string
  action?: 'analyze' | 'backtest'
  marketData?: any[]
}

export async function POST(request: NextRequest) {
  try {
    const body: StrategyRequest = await request.json()
    const { symbol, action = 'analyze', marketData } = body

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
    }

    if (action === 'analyze') {
      if (!marketData || marketData.length === 0) {
        return NextResponse.json({ error: 'Market data is required for analysis' }, { status: 400 })
      }

      // Get individual strategy signals
      const signals = await strategyManager.analyzeSymbol(symbol, marketData)
      
      // Get consensus signal
      const consensusSignal = await strategyManager.getConsensusSignal(symbol, marketData)

      return NextResponse.json({
        symbol,
        signals,
        consensus: consensusSignal,
        timestamp: new Date().toISOString()
      })
    } else if (action === 'backtest') {
      if (!marketData || marketData.length < 100) {
        return NextResponse.json({ error: 'At least 100 data points required for backtesting' }, { status: 400 })
      }

      const results = await strategyManager.backtestAllStrategies(marketData)

      return NextResponse.json({
        symbol,
        results: Object.fromEntries(results),
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in strategies API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const activeStrategies = strategyManager.getActiveStrategies()

    return NextResponse.json({
      activeStrategies,
      availableStrategies: ['technical', 'ml', 'arbitrage'],
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching strategies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}