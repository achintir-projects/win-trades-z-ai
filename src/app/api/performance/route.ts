import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitoringService } from '@/lib/performance-monitoring'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    if (action === 'add-trade') {
      const trade = data.trade
      
      if (!trade) {
        return NextResponse.json({ error: 'Trade data required' }, { status: 400 })
      }

      performanceMonitoringService.addTrade(trade)

      return NextResponse.json({
        action: 'add-trade',
        success: true,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'generate-report') {
      const report = performanceMonitoringService.generatePerformanceReport()

      return NextResponse.json({
        action: 'generate-report',
        report,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'export-data') {
      const exportData = performanceMonitoringService.exportPerformanceData()

      return NextResponse.json({
        action: 'export-data',
        data: exportData,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'clear-history') {
      performanceMonitoringService.clearTradeHistory()

      return NextResponse.json({
        action: 'clear-history',
        success: true,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in performance API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const strategy = searchParams.get('strategy')
    const symbol = searchParams.get('symbol')

    if (type === 'full-report') {
      const report = performanceMonitoringService.getPerformanceReport()
      return NextResponse.json({
        type: 'full-report',
        report,
        timestamp: new Date().toISOString()
      })
    }

    if (strategy) {
      const strategyPerformance = performanceMonitoringService.getStrategyPerformance(strategy)
      if (!strategyPerformance) {
        return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
      }

      return NextResponse.json({
        type: 'strategy-performance',
        strategy,
        performance: strategyPerformance,
        timestamp: new Date().toISOString()
      })
    }

    if (symbol) {
      const symbolPerformance = performanceMonitoringService.getSymbolPerformance(symbol)
      if (!symbolPerformance) {
        return NextResponse.json({ error: 'Symbol not found' }, { status: 404 })
      }

      return NextResponse.json({
        type: 'symbol-performance',
        symbol,
        performance: symbolPerformance,
        timestamp: new Date().toISOString()
      })
    }

    if (type === 'top-strategies') {
      const limit = parseInt(searchParams.get('limit') || '5')
      const topStrategies = performanceMonitoringService.getTopPerformingStrategies(limit)

      return NextResponse.json({
        type: 'top-strategies',
        strategies: topStrategies,
        timestamp: new Date().toISOString()
      })
    }

    if (type === 'worst-strategies') {
      const limit = parseInt(searchParams.get('limit') || '5')
      const worstStrategies = performanceMonitoringService.getWorstPerformingStrategies(limit)

      return NextResponse.json({
        type: 'worst-strategies',
        strategies: worstStrategies,
        timestamp: new Date().toISOString()
      })
    }

    if (type === 'overall') {
      const report = performanceMonitoringService.getPerformanceReport()
      return NextResponse.json({
        type: 'overall',
        performance: report.overall,
        timestamp: new Date().toISOString()
      })
    }

    if (type === 'risk-metrics') {
      const report = performanceMonitoringService.getPerformanceReport()
      return NextResponse.json({
        type: 'risk-metrics',
        riskMetrics: report.riskMetrics,
        timestamp: new Date().toISOString()
      })
    }

    if (type === 'equity-curve') {
      const report = performanceMonitoringService.getPerformanceReport()
      return NextResponse.json({
        type: 'equity-curve',
        equityCurve: report.equityCurve,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching performance data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}