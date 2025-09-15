import { NextRequest, NextResponse } from 'next/server'

interface Trade {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  quantity: number
  entryPrice: number
  currentPrice: number
  profitLoss: number
  profitLossPercent: number
  status: 'open' | 'closed'
  timestamp: string
}

export async function GET(request: NextRequest) {
  try {
    // Simulated trades data - in a real implementation, this would fetch from the database
    const trades: Trade[] = [
      {
        id: '1',
        symbol: 'BTC/USD',
        type: 'buy',
        quantity: 0.5,
        entryPrice: 42000,
        currentPrice: 43256.78,
        profitLoss: 628.39,
        profitLossPercent: 2.99,
        status: 'open',
        timestamp: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        symbol: 'EUR/USD',
        type: 'buy',
        quantity: 100000,
        entryPrice: 1.0833,
        currentPrice: 1.0856,
        profitLoss: 230,
        profitLossPercent: 0.21,
        status: 'open',
        timestamp: '2024-01-15T11:15:00Z'
      },
      {
        id: '3',
        symbol: 'AAPL',
        type: 'buy',
        quantity: 100,
        entryPrice: 180.18,
        currentPrice: 182.52,
        profitLoss: 234,
        profitLossPercent: 1.30,
        status: 'open',
        timestamp: '2024-01-15T09:45:00Z'
      },
      {
        id: '4',
        symbol: 'XAU/USD',
        type: 'buy',
        quantity: 10,
        entryPrice: 2022.22,
        currentPrice: 2034.56,
        profitLoss: 123.4,
        profitLossPercent: 0.61,
        status: 'open',
        timestamp: '2024-01-15T12:00:00Z'
      },
      {
        id: '5',
        symbol: 'ETH/USD',
        type: 'buy',
        quantity: 5,
        entryPrice: 2500.22,
        currentPrice: 2589.45,
        profitLoss: 446.15,
        profitLossPercent: 3.57,
        status: 'open',
        timestamp: '2024-01-15T13:30:00Z'
      },
      {
        id: '6',
        symbol: 'GBP/USD',
        type: 'sell',
        quantity: 50000,
        entryPrice: 1.2746,
        currentPrice: 1.2734,
        profitLoss: 60,
        profitLossPercent: 0.09,
        status: 'open',
        timestamp: '2024-01-15T14:15:00Z'
      }
    ]

    return NextResponse.json(trades)
  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real implementation, this would:
    // 1. Validate the trade request
    // 2. Check risk management rules
    // 3. Execute the trade via broker API
    // 4. Save to database
    
    const trade = {
      id: Math.random().toString(36).substr(2, 9),
      ...body,
      status: 'open',
      timestamp: new Date().toISOString(),
      profitLoss: 0,
      profitLossPercent: 0
    }
    
    return NextResponse.json(trade, { status: 201 })
  } catch (error) {
    console.error('Error creating trade:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}