import { NextRequest, NextResponse } from 'next/server'
import { marketAnalysisService } from '@/lib/market-analysis'

interface MarketData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  type: 'forex' | 'crypto' | 'commodity' | 'stock'
}

interface EnhancedMarketData extends MarketData {
  analysis?: {
    trend: 'bullish' | 'bearish' | 'neutral'
    strength: number
    recommendation: 'buy' | 'sell' | 'hold'
    confidence: number
  }
  sentiment?: {
    sentiment: 'positive' | 'negative' | 'neutral'
    score: number
  }
}

export async function GET(request: NextRequest) {
  try {
    // Base market data
    const marketData: MarketData[] = [
      // Forex pairs
      {
        symbol: 'EUR/USD',
        name: 'Euro/US Dollar',
        price: 1.0856,
        change: 0.0023,
        changePercent: 0.21,
        volume: 125000,
        type: 'forex'
      },
      {
        symbol: 'GBP/USD',
        name: 'British Pound/US Dollar',
        price: 1.2734,
        change: -0.0012,
        changePercent: -0.09,
        volume: 98000,
        type: 'forex'
      },
      {
        symbol: 'USD/JPY',
        name: 'US Dollar/Japanese Yen',
        price: 149.85,
        change: 0.45,
        changePercent: 0.30,
        volume: 156000,
        type: 'forex'
      },
      {
        symbol: 'AUD/USD',
        name: 'Australian Dollar/US Dollar',
        price: 0.6523,
        change: 0.0018,
        changePercent: 0.28,
        volume: 78000,
        type: 'forex'
      },
      
      // Crypto
      {
        symbol: 'BTC/USD',
        name: 'Bitcoin/US Dollar',
        price: 43256.78,
        change: 1234.56,
        changePercent: 2.94,
        volume: 2850000000,
        type: 'crypto'
      },
      {
        symbol: 'ETH/USD',
        name: 'Ethereum/US Dollar',
        price: 2589.45,
        change: 89.23,
        changePercent: 3.57,
        volume: 1560000000,
        type: 'crypto'
      },
      {
        symbol: 'BNB/USD',
        name: 'Binance Coin/US Dollar',
        price: 312.89,
        change: 5.67,
        changePercent: 1.85,
        volume: 234000000,
        type: 'crypto'
      },
      {
        symbol: 'SOL/USD',
        name: 'Solana/US Dollar',
        price: 98.45,
        change: 3.21,
        changePercent: 3.37,
        volume: 456000000,
        type: 'crypto'
      },
      
      // Commodities
      {
        symbol: 'XAU/USD',
        name: 'Gold/US Dollar',
        price: 2034.56,
        change: 12.34,
        changePercent: 0.61,
        volume: 145000,
        type: 'commodity'
      },
      {
        symbol: 'XAG/USD',
        name: 'Silver/US Dollar',
        price: 24.56,
        change: 0.23,
        changePercent: 0.94,
        volume: 89000,
        type: 'commodity'
      },
      {
        symbol: 'CL/USD',
        name: 'Crude Oil/US Dollar',
        price: 78.45,
        change: -1.23,
        changePercent: -1.54,
        volume: 234000,
        type: 'commodity'
      },
      {
        symbol: 'NG/USD',
        name: 'Natural Gas/US Dollar',
        price: 2.89,
        change: 0.05,
        changePercent: 1.76,
        volume: 123000,
        type: 'commodity'
      },
      
      // Stocks
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 182.52,
        change: 2.34,
        changePercent: 1.30,
        volume: 45600000,
        type: 'stock'
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        price: 141.89,
        change: 1.23,
        changePercent: 0.87,
        volume: 23400000,
        type: 'stock'
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        price: 378.91,
        change: 4.56,
        changePercent: 1.22,
        volume: 34500000,
        type: 'stock'
      },
      {
        symbol: 'TSLA',
        name: 'Tesla Inc.',
        price: 238.45,
        change: -3.21,
        changePercent: -1.33,
        volume: 67800000,
        type: 'stock'
      }
    ]

    // Generate enhanced market data with analysis
    const enhancedData: EnhancedMarketData[] = await Promise.all(
      marketData.map(async (market) => {
        try {
          // Generate historical data for analysis (simulated)
          const historicalData = generateHistoricalData(market)
          
          // Perform technical analysis
          const analysis = await marketAnalysisService.analyzeMarket(market.symbol, historicalData)
          
          // Perform sentiment analysis
          const sentiment = await marketAnalysisService.analyzeSentiment(market.symbol)
          
          return {
            ...market,
            analysis: {
              trend: analysis.trend,
              strength: analysis.strength,
              recommendation: analysis.recommendation,
              confidence: analysis.confidence
            },
            sentiment: {
              sentiment: sentiment.sentiment,
              score: sentiment.score
            }
          }
        } catch (error) {
          console.error(`Error analyzing ${market.symbol}:`, error)
          return market
        }
      })
    )

    return NextResponse.json(enhancedData)
  } catch (error) {
    console.error('Error fetching market data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate simulated historical data
function generateHistoricalData(market: MarketData, periods: number = 50) {
  const data = []
  let currentPrice = market.price - (market.change * 10) // Start from a lower price
  
  for (let i = 0; i < periods; i++) {
    const volatility = market.type === 'crypto' ? 0.05 : market.type === 'forex' ? 0.002 : 0.01
    const change = (Math.random() - 0.5) * volatility * currentPrice
    currentPrice += change
    
    data.push({
      symbol: market.symbol,
      name: market.name,
      price: currentPrice,
      change: change,
      changePercent: (change / currentPrice) * 100,
      volume: market.volume * (0.8 + Math.random() * 0.4),
      type: market.type,
      high: currentPrice * (1 + Math.random() * 0.01),
      low: currentPrice * (1 - Math.random() * 0.01),
      close: currentPrice,
      timestamp: new Date(Date.now() - (periods - i) * 5 * 60 * 1000).toISOString()
    })
  }
  
  return data
}