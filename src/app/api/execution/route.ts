import { NextRequest, NextResponse } from 'next/server'
import { tradingExecutionService } from '@/lib/trading-execution'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    if (action === 'execute') {
      const { orderRequest, portfolio } = data
      
      if (!orderRequest || !portfolio) {
        return NextResponse.json({ error: 'Order request and portfolio data required' }, { status: 400 })
      }

      const result = await tradingExecutionService.executeOrder(orderRequest, portfolio)

      return NextResponse.json({
        action: 'execute',
        result,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'cancel') {
      const { orderId } = data
      
      if (!orderId) {
        return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
      }

      const success = tradingExecutionService.cancelOrder(orderId)

      return NextResponse.json({
        action: 'cancel',
        success,
        orderId,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in trading execution API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const orderId = searchParams.get('orderId')
    const symbol = searchParams.get('symbol')

    if (orderId) {
      // Get specific order
      const order = tradingExecutionService.getOrder(orderId)
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      return NextResponse.json({
        order,
        timestamp: new Date().toISOString()
      })
    }

    if (symbol) {
      // Get position for symbol
      const position = tradingExecutionService.getPosition(symbol)
      const marketData = tradingExecutionService.getMarketData(symbol)

      return NextResponse.json({
        symbol,
        position,
        marketData,
        timestamp: new Date().toISOString()
      })
    }

    if (type === 'orders') {
      // Get all orders
      const orders = tradingExecutionService.getOrders()
      return NextResponse.json({
        orders,
        timestamp: new Date().toISOString()
      })
    }

    if (type === 'pending-orders') {
      // Get pending orders
      const pendingOrders = tradingExecutionService.getPendingOrders()
      return NextResponse.json({
        pendingOrders,
        timestamp: new Date().toISOString()
      })
    }

    if (type === 'positions') {
      // Get all positions
      const positions = tradingExecutionService.getPositions()
      return NextResponse.json({
        positions,
        timestamp: new Date().toISOString()
      })
    }

    if (type === 'open-positions') {
      // Get open positions
      const openPositions = tradingExecutionService.getOpenPositions()
      return NextResponse.json({
        openPositions,
        timestamp: new Date().toISOString()
      })
    }

    if (type === 'market-data') {
      // Get all market data
      const marketData = tradingExecutionService.getAllMarketData()
      return NextResponse.json({
        marketData,
        timestamp: new Date().toISOString()
      })
    }

    if (type === 'portfolio-summary') {
      // Get portfolio summary
      const summary = tradingExecutionService.getPortfolioSummary()
      return NextResponse.json({
        summary,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching trading data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}