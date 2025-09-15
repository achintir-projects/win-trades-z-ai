import ZAI from 'z-ai-web-dev-sdk'

interface MarketData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  type: 'forex' | 'crypto' | 'commodity' | 'stock'
}

interface TechnicalIndicators {
  rsi: number
  macd: {
    macd: number
    signal: number
    histogram: number
  }
  sma: {
    sma20: number
    sma50: number
    sma200: number
  }
  bollinger: {
    upper: number
    middle: number
    lower: number
  }
  stochastic: {
    k: number
    d: number
  }
}

interface MarketAnalysis {
  symbol: string
  trend: 'bullish' | 'bearish' | 'neutral'
  strength: number
  support: number[]
  resistance: number[]
  indicators: TechnicalIndicators
  recommendation: 'buy' | 'sell' | 'hold'
  confidence: number
  timeframe: string
}

interface SentimentAnalysis {
  symbol: string
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number
  sources: string[]
  keywords: string[]
  timestamp: string
}

export class MarketAnalysisService {
  private zai: any

  constructor() {
    this.zai = null
  }

  async initialize() {
    try {
      this.zai = await ZAI.create()
    } catch (error) {
      console.error('Failed to initialize ZAI:', error)
    }
  }

  async analyzeMarket(symbol: string, marketData: MarketData[]): Promise<MarketAnalysis> {
    if (!this.zai) {
      await this.initialize()
    }

    try {
      // Calculate technical indicators
      const indicators = this.calculateTechnicalIndicators(marketData)
      
      // Use AI to analyze market conditions
      const analysis = await this.performAIAnalysis(symbol, marketData, indicators)
      
      return analysis
    } catch (error) {
      console.error('Error analyzing market:', error)
      throw error
    }
  }

  private calculateTechnicalIndicators(data: MarketData[]): TechnicalIndicators {
    const prices = data.map(d => d.price)
    const closes = data.map(d => d.close || d.price)
    
    return {
      rsi: this.calculateRSI(closes),
      macd: this.calculateMACD(closes),
      sma: {
        sma20: this.calculateSMA(closes, 20),
        sma50: this.calculateSMA(closes, 50),
        sma200: this.calculateSMA(closes, 200)
      },
      bollinger: this.calculateBollingerBands(closes, 20),
      stochastic: this.calculateStochastic(data)
    }
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50

    const changes = []
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1])
    }

    const gains = changes.filter(change => change > 0)
    const losses = changes.filter(change => change < 0).map(loss => Math.abs(loss))

    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0

    if (avgLoss === 0) return 100

    const rs = avgGain / avgLoss
    const rsi = 100 - (100 / (1 + rs))

    return rsi
  }

  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12)
    const ema26 = this.calculateEMA(prices, 26)
    const macd = ema12 - ema26
    
    // For simplicity, using a fixed signal line
    const signal = macd * 0.9
    const histogram = macd - signal

    return { macd, signal, histogram }
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0

    const multiplier = 2 / (period + 1)
    let ema = prices[0]

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema
    }

    return ema
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0

    const sum = prices.slice(-period).reduce((a, b) => a + b, 0)
    return sum / period
  }

  private calculateBollingerBands(prices: number[], period: number): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(prices, period)
    const recentPrices = prices.slice(-period)
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
    const stdDev = Math.sqrt(variance)
    
    return {
      upper: sma + (stdDev * 2),
      middle: sma,
      lower: sma - (stdDev * 2)
    }
  }

  private calculateStochastic(data: MarketData[], period: number = 14): { k: number; d: number } {
    if (data.length < period) return { k: 50, d: 50 }

    const recentData = data.slice(-period)
    const highestHigh = Math.max(...recentData.map(d => d.high || d.price))
    const lowestLow = Math.min(...recentData.map(d => d.low || d.price))
    const currentClose = data[data.length - 1].price

    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100
    const d = k // Simplified - would typically use SMA of K values

    return { k, d }
  }

  private async performAIAnalysis(symbol: string, marketData: MarketData[], indicators: TechnicalIndicators): Promise<MarketAnalysis> {
    if (!this.zai) {
      // Fallback analysis without AI
      return this.performFallbackAnalysis(symbol, marketData, indicators)
    }

    try {
      const prompt = `
        Analyze the following market data for ${symbol} and provide trading recommendations:
        
        Recent Prices: ${marketData.slice(-10).map(d => d.price.toFixed(4)).join(', ')}
        RSI: ${indicators.rsi.toFixed(2)}
        MACD: ${indicators.macd.macd.toFixed(4)}
        SMA20: ${indicators.sma.sma20.toFixed(4)}
        SMA50: ${indicators.sma.sma50.toFixed(4)}
        
        Provide analysis in JSON format with:
        - trend: "bullish", "bearish", or "neutral"
        - strength: number 0-100
        - support: array of support levels
        - resistance: array of resistance levels
        - recommendation: "buy", "sell", or "hold"
        - confidence: number 0-100
        - timeframe: "short-term", "medium-term", or "long-term"
      `

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert trading analyst. Provide market analysis in JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      })

      const response = completion.choices[0]?.message?.content
      if (response) {
        try {
          const analysis = JSON.parse(response)
          return {
            symbol,
            ...analysis,
            indicators
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError)
          return this.performFallbackAnalysis(symbol, marketData, indicators)
        }
      }

      return this.performFallbackAnalysis(symbol, marketData, indicators)
    } catch (error) {
      console.error('AI analysis failed:', error)
      return this.performFallbackAnalysis(symbol, marketData, indicators)
    }
  }

  private performFallbackAnalysis(symbol: string, marketData: MarketData[], indicators: TechnicalIndicators): MarketAnalysis {
    const currentPrice = marketData[marketData.length - 1]?.price || 0
    const previousPrice = marketData[marketData.length - 2]?.price || currentPrice
    
    // Simple trend analysis
    const priceChange = currentPrice - previousPrice
    const trend = priceChange > 0 ? 'bullish' : priceChange < 0 ? 'bearish' : 'neutral'
    
    // RSI-based strength
    let strength = 50
    if (indicators.rsi > 70) strength = 80
    else if (indicators.rsi < 30) strength = 20
    else if (indicators.rsi > 50) strength = 65
    else strength = 35

    // Simple support/resistance levels
    const prices = marketData.map(d => d.price)
    const support = [Math.min(...prices) * 0.99, Math.min(...prices) * 0.98]
    const resistance = [Math.max(...prices) * 1.01, Math.max(...prices) * 1.02]

    // Recommendation based on indicators
    let recommendation: 'buy' | 'sell' | 'hold' = 'hold'
    let confidence = 50

    if (indicators.rsi < 30 && trend === 'bullish') {
      recommendation = 'buy'
      confidence = 85
    } else if (indicators.rsi > 70 && trend === 'bearish') {
      recommendation = 'sell'
      confidence = 85
    } else if (indicators.macd.macd > indicators.macd.signal && trend === 'bullish') {
      recommendation = 'buy'
      confidence = 75
    } else if (indicators.macd.macd < indicators.macd.signal && trend === 'bearish') {
      recommendation = 'sell'
      confidence = 75
    }

    return {
      symbol,
      trend,
      strength,
      support,
      resistance,
      indicators,
      recommendation,
      confidence,
      timeframe: 'short-term'
    }
  }

  async analyzeSentiment(symbol: string): Promise<SentimentAnalysis> {
    if (!this.zai) {
      await this.initialize()
    }

    try {
      const prompt = `
        Analyze market sentiment for ${symbol} by searching for recent news and social media discussions.
        Provide sentiment analysis in JSON format with:
        - sentiment: "positive", "negative", or "neutral"
        - score: number -100 to 100
        - sources: array of source names
        - keywords: array of relevant keywords
      `

      const searchResult = await this.zai.functions.invoke("web_search", {
        query: `${symbol} trading news sentiment analysis`,
        num: 5
      })

      // Analyze search results for sentiment
      const sentiment = this.analyzeSearchSentiment(searchResult)

      return {
        symbol,
        sentiment: sentiment.sentiment,
        score: sentiment.score,
        sources: sentiment.sources,
        keywords: sentiment.keywords,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Sentiment analysis failed:', error)
      return {
        symbol,
        sentiment: 'neutral',
        score: 0,
        sources: [],
        keywords: [],
        timestamp: new Date().toISOString()
      }
    }
  }

  private analyzeSearchSentiment(searchResults: any[]): { sentiment: 'positive' | 'negative' | 'neutral'; score: number; sources: string[]; keywords: string[] } {
    if (!searchResults || searchResults.length === 0) {
      return { sentiment: 'neutral', score: 0, sources: [], keywords: [] }
    }

    const positiveKeywords = ['bullish', 'gain', 'profit', 'growth', 'rise', 'surge', 'up', 'positive']
    const negativeKeywords = ['bearish', 'loss', 'decline', 'fall', 'drop', 'down', 'negative', 'risk']

    let positiveScore = 0
    let negativeScore = 0
    const sources: string[] = []
    const keywords: string[] = []

    searchResults.forEach((result: any) => {
      const text = (result.name + ' ' + result.snippet).toLowerCase()
      
      positiveKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          positiveScore++
          keywords.push(keyword)
        }
      })

      negativeKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          negativeScore++
          keywords.push(keyword)
        }
      })

      if (result.host_name) {
        sources.push(result.host_name)
      }
    })

    const totalScore = positiveScore - negativeScore
    const maxPossible = Math.max(positiveScore + negativeScore, 1)
    const normalizedScore = (totalScore / maxPossible) * 100

    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (normalizedScore > 20) sentiment = 'positive'
    else if (normalizedScore < -20) sentiment = 'negative'

    return {
      sentiment,
      score: normalizedScore,
      sources: [...new Set(sources)],
      keywords: [...new Set(keywords)]
    }
  }
}

export const marketAnalysisService = new MarketAnalysisService()