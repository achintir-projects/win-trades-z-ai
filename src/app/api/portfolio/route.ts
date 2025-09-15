import { NextRequest, NextResponse } from 'next/server'

interface Portfolio {
  totalValue: number
  dailyChange: number
  dailyChangePercent: number
  totalReturn: number
  totalReturnPercent: number
  winRate: number
  activeTrades: number
}

export async function GET(request: NextRequest) {
  try {
    // Simulated portfolio data - in a real implementation, this would calculate from actual trades and positions
    const portfolio: Portfolio = {
      totalValue: 1250000,
      dailyChange: 15420,
      dailyChangePercent: 1.24,
      totalReturn: 250000,
      totalReturnPercent: 25.0,
      winRate: 100.0,
      activeTrades: 6
    }

    return NextResponse.json(portfolio)
  } catch (error) {
    console.error('Error fetching portfolio:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}