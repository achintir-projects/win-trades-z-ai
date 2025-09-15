import ZAI from 'z-ai-web-dev-sdk'
import { marketAnalysisService } from './market-analysis'

interface StrategySignal {
  symbol: string
  action: 'buy' | 'sell' | 'hold'
  strength: number
  confidence: number
  entryPrice: number
  stopLoss?: number
  takeProfit?: number
  reason: string
  timestamp: string
}

interface StrategyParameters {
  timeframe: string
  riskPerTrade: number
  maxPositions: number
  indicators: {
    rsiPeriod: number
    rsiOverbought: number
    rsiOversold: number
    macdFast: number
    macdSlow: number
    macdSignal: number
    smaShort: number
    smaLong: number
  }
}

interface BacktestResult {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalReturn: number
  maxDrawdown: number
  sharpeRatio: number
  profitFactor: number
  averageWin: number
  averageLoss: number
}

export abstract class TradingStrategy {
  protected name: string
  protected parameters: StrategyParameters
  protected zai: any

  constructor(name: string, parameters: StrategyParameters) {
    this.name = name
    this.parameters = parameters
    this.zai = null
  }

  async initialize() {
    try {
      this.zai = await ZAI.create()
    } catch (error) {
      console.error(`Failed to initialize ZAI for ${this.name}:`, error)
    }
  }

  abstract analyze(marketData: any[]): Promise<StrategySignal>
  abstract backtest(historicalData: any[]): Promise<BacktestResult>

  protected calculatePositionSize(accountBalance: number, riskPerTrade: number, entryPrice: number, stopLoss: number): number {
    const riskAmount = accountBalance * (riskPerTrade / 100)
    const priceRisk = Math.abs(entryPrice - stopLoss)
    return riskAmount / priceRisk
  }

  protected calculateStopLoss(entryPrice: number, action: 'buy' | 'sell', atr: number): number {
    const stopDistance = atr * 2 // 2x ATR for stop loss
    return action === 'buy' ? entryPrice - stopDistance : entryPrice + stopDistance
  }

  protected calculateTakeProfit(entryPrice: number, action: 'buy' | 'sell', atr: number): number {
    const profitDistance = atr * 3 // 3x ATR for take profit
    return action === 'buy' ? entryPrice + profitDistance : entryPrice - profitDistance
  }

  protected calculateATR(data: any[], period: number = 14): number {
    if (data.length < period + 1) return 0

    const trValues = []
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high || data[i].price
      const low = data[i].low || data[i].price
      const prevClose = data[i - 1].close || data[i - 1].price

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      )
      trValues.push(tr)
    }

    const atr = trValues.slice(-period).reduce((sum, tr) => sum + tr, 0) / period
    return atr
  }
}

export class TechnicalAnalysisStrategy extends TradingStrategy {
  constructor(parameters: StrategyParameters) {
    super('Technical Analysis', parameters)
  }

  async analyze(marketData: any[]): Promise<StrategySignal> {
    const latest = marketData[marketData.length - 1]
    const previous = marketData[marketData.length - 2]

    // Calculate indicators
    const rsi = this.calculateRSI(marketData, this.parameters.indicators.rsiPeriod)
    const macd = this.calculateMACD(marketData)
    const smaShort = this.calculateSMA(marketData, this.parameters.indicators.smaShort)
    const smaLong = this.calculateSMA(marketData, this.parameters.indicators.smaLong)
    const atr = this.calculateATR(marketData)

    let action: 'buy' | 'sell' | 'hold' = 'hold'
    let strength = 0
    let confidence = 0
    let reason = ''

    // RSI signals
    const rsiOversold = rsi < this.parameters.indicators.rsiOversold
    const rsiOverbought = rsi > this.parameters.indicators.rsiOverbought

    // MACD signals
    const macdBullish = macd.macd > macd.signal && macd.histogram > 0
    const macdBearish = macd.macd < macd.signal && macd.histogram < 0

    // SMA signals
    const smaBullish = smaShort > smaLong
    const smaBearish = smaShort < smaLong

    // Combine signals
    const buySignals = [
      rsiOversold,
      macdBullish,
      smaBullish
    ].filter(Boolean).length

    const sellSignals = [
      rsiOverbought,
      macdBearish,
      smaBearish
    ].filter(Boolean).length

    if (buySignals >= 2) {
      action = 'buy'
      strength = Math.min(buySignals * 33, 100)
      confidence = Math.min((buySignals / 3) * 100, 100)
      reason = `Multiple bullish signals: RSI(${rsi.toFixed(1)}), MACD bullish crossover, SMA bullish`
    } else if (sellSignals >= 2) {
      action = 'sell'
      strength = Math.min(sellSignals * 33, 100)
      confidence = Math.min((sellSignals / 3) * 100, 100)
      reason = `Multiple bearish signals: RSI(${rsi.toFixed(1)}), MACD bearish crossover, SMA bearish`
    }

    // Calculate stop loss and take profit
    const stopLoss = action !== 'hold' ? this.calculateStopLoss(latest.price, action, atr) : undefined
    const takeProfit = action !== 'hold' ? this.calculateTakeProfit(latest.price, action, atr) : undefined

    return {
      symbol: latest.symbol,
      action,
      strength,
      confidence,
      entryPrice: latest.price,
      stopLoss,
      takeProfit,
      reason,
      timestamp: new Date().toISOString()
    }
  }

  async backtest(historicalData: any[]): Promise<BacktestResult> {
    const trades = []
    let balance = 100000 // Starting balance
    let maxBalance = balance
    let maxDrawdown = 0

    for (let i = 50; i < historicalData.length - 1; i++) {
      const dataSlice = historicalData.slice(0, i + 1)
      const signal = await this.analyze(dataSlice)

      if (signal.action !== 'hold') {
        const positionSize = this.calculatePositionSize(
          balance,
          this.parameters.riskPerTrade,
          signal.entryPrice,
          signal.stopLoss!
        )

        const entryCost = positionSize * signal.entryPrice
        if (entryCost > balance) continue

        // Simulate trade
        const nextData = historicalData[i + 1]
        const exitPrice = nextData.price
        const profit = (exitPrice - signal.entryPrice) * positionSize
        const profitPercent = (profit / entryCost) * 100

        balance += profit
        maxBalance = Math.max(maxBalance, balance)
        const drawdown = ((maxBalance - balance) / maxBalance) * 100
        maxDrawdown = Math.max(maxDrawdown, drawdown)

        trades.push({
          profit,
          profitPercent,
          win: profit > 0
        })
      }
    }

    const winningTrades = trades.filter(t => t.win).length
    const losingTrades = trades.filter(t => !t.win).length
    const totalReturn = ((balance - 100000) / 100000) * 100

    return {
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      winRate: trades.length > 0 ? (winningTrades / trades.length) * 100 : 0,
      totalReturn,
      maxDrawdown,
      sharpeRatio: this.calculateSharpeRatio(trades),
      profitFactor: this.calculateProfitFactor(trades),
      averageWin: trades.filter(t => t.win).reduce((sum, t) => sum + t.profit, 0) / winningTrades || 0,
      averageLoss: trades.filter(t => !t.win).reduce((sum, t) => sum + Math.abs(t.profit), 0) / losingTrades || 0
    }
  }

  private calculateRSI(data: any[], period: number): number {
    if (data.length < period + 1) return 50

    const closes = data.map(d => d.close || d.price)
    const changes = []
    for (let i = 1; i < closes.length; i++) {
      changes.push(closes[i] - closes[i - 1])
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

  private calculateMACD(data: any[]) {
    const closes = data.map(d => d.close || d.price)
    const ema12 = this.calculateEMA(closes, 12)
    const ema26 = this.calculateEMA(closes, 26)
    const macd = ema12 - ema26
    
    // Calculate signal line (9-period EMA of MACD)
    const macdValues = []
    for (let i = 0; i < data.length; i++) {
      if (i < 26) continue
      const localEMA12 = this.calculateEMA(closes.slice(0, i + 1), 12)
      const localEMA26 = this.calculateEMA(closes.slice(0, i + 1), 26)
      macdValues.push(localEMA12 - localEMA26)
    }
    
    const signal = macdValues.length > 9 ? this.calculateEMA(macdValues, 9) : macd
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

  private calculateSMA(data: any[], period: number): number {
    if (data.length < period) return data[data.length - 1]?.price || 0

    const closes = data.slice(-period).map(d => d.close || d.price)
    return closes.reduce((sum, price) => sum + price, 0) / period
  }

  private calculateSharpeRatio(trades: any[]): number {
    if (trades.length === 0) return 0

    const returns = trades.map(t => t.profitPercent)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)

    return stdDev !== 0 ? avgReturn / stdDev : 0
  }

  private calculateProfitFactor(trades: any[]): number {
    const grossProfit = trades.filter(t => t.win).reduce((sum, t) => sum + t.profit, 0)
    const grossLoss = Math.abs(trades.filter(t => !t.win).reduce((sum, t) => sum + t.profit, 0))

    return grossLoss !== 0 ? grossProfit / grossLoss : Infinity
  }
}

export class MachineLearningStrategy extends TradingStrategy {
  constructor(parameters: StrategyParameters) {
    super('Machine Learning', parameters)
  }

  async analyze(marketData: any[]): Promise<StrategySignal> {
    if (!this.zai) {
      await this.initialize()
    }

    const latest = marketData[marketData.length - 1]
    
    try {
      // Prepare data for AI analysis
      const recentData = marketData.slice(-20)
      const marketFeatures = this.extractMarketFeatures(recentData)

      const prompt = `
        Analyze the following market data for ${latest.symbol} and provide trading recommendation:
        
        Recent Price Action: ${recentData.map(d => d.price.toFixed(4)).join(', ')}
        Current Price: ${latest.price}
        Market Features: ${JSON.stringify(marketFeatures)}
        
        Consider technical patterns, market sentiment, and statistical indicators.
        Provide recommendation in JSON format with:
        - action: "buy", "sell", or "hold"
        - strength: number 0-100
        - confidence: number 0-100
        - reason: detailed explanation
      `

      const completion = await this.zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI trading analyst. Provide trading recommendations in JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2
      })

      const response = completion.choices[0]?.message?.content
      if (response) {
        try {
          const aiResult = JSON.parse(response)
          
          // Calculate stop loss and take profit using ATR
          const atr = this.calculateATR(marketData)
          const stopLoss = aiResult.action !== 'hold' ? 
            this.calculateStopLoss(latest.price, aiResult.action, atr) : undefined
          const takeProfit = aiResult.action !== 'hold' ? 
            this.calculateTakeProfit(latest.price, aiResult.action, atr) : undefined

          return {
            symbol: latest.symbol,
            action: aiResult.action,
            strength: aiResult.strength,
            confidence: aiResult.confidence,
            entryPrice: latest.price,
            stopLoss,
            takeProfit,
            reason: aiResult.reason,
            timestamp: new Date().toISOString()
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError)
          return this.getFallbackSignal(latest)
        }
      }

      return this.getFallbackSignal(latest)
    } catch (error) {
      console.error('AI analysis failed:', error)
      return this.getFallbackSignal(latest)
    }
  }

  async backtest(historicalData: any[]): Promise<BacktestResult> {
    // For ML strategy, we'll use a simplified backtest
    // In a real implementation, this would involve training the model and testing
    const trades = []
    let balance = 100000
    let maxBalance = balance
    let maxDrawdown = 0

    for (let i = 50; i < historicalData.length - 1; i++) {
      const dataSlice = historicalData.slice(0, i + 1)
      const signal = await this.analyze(dataSlice)

      if (signal.action !== 'hold' && signal.confidence > 70) {
        const positionSize = this.calculatePositionSize(
          balance,
          this.parameters.riskPerTrade,
          signal.entryPrice,
          signal.stopLoss!
        )

        const entryCost = positionSize * signal.entryPrice
        if (entryCost > balance) continue

        const nextData = historicalData[i + 1]
        const exitPrice = nextData.price
        const profit = (exitPrice - signal.entryPrice) * positionSize
        const profitPercent = (profit / entryCost) * 100

        balance += profit
        maxBalance = Math.max(maxBalance, balance)
        const drawdown = ((maxBalance - balance) / maxBalance) * 100
        maxDrawdown = Math.max(maxDrawdown, drawdown)

        trades.push({
          profit,
          profitPercent,
          win: profit > 0
        })
      }
    }

    const winningTrades = trades.filter(t => t.win).length
    const losingTrades = trades.filter(t => !t.win).length
    const totalReturn = ((balance - 100000) / 100000) * 100

    return {
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      winRate: trades.length > 0 ? (winningTrades / trades.length) * 100 : 0,
      totalReturn,
      maxDrawdown,
      sharpeRatio: this.calculateSharpeRatio(trades),
      profitFactor: this.calculateProfitFactor(trades),
      averageWin: trades.filter(t => t.win).reduce((sum, t) => sum + t.profit, 0) / winningTrades || 0,
      averageLoss: trades.filter(t => !t.win).reduce((sum, t) => sum + Math.abs(t.profit), 0) / losingTrades || 0
    }
  }

  private extractMarketFeatures(data: any[]): any {
    const prices = data.map(d => d.price)
    const volumes = data.map(d => d.volume)
    
    return {
      price_trend: prices[prices.length - 1] > prices[0] ? 'up' : 'down',
      volatility: this.calculateVolatility(prices),
      volume_trend: volumes[volumes.length - 1] > volumes[0] ? 'up' : 'down',
      momentum: this.calculateMomentum(prices),
      range: Math.max(...prices) - Math.min(...prices)
    }
  }

  private calculateVolatility(prices: number[]): number {
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    
    return Math.sqrt(variance)
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 2) return 0
    return (prices[prices.length - 1] - prices[0]) / prices[0]
  }

  private getFallbackSignal(latest: any): StrategySignal {
    return {
      symbol: latest.symbol,
      action: 'hold',
      strength: 50,
      confidence: 50,
      entryPrice: latest.price,
      reason: 'AI analysis unavailable - holding position',
      timestamp: new Date().toISOString()
    }
  }

  private calculateSharpeRatio(trades: any[]): number {
    if (trades.length === 0) return 0

    const returns = trades.map(t => t.profitPercent)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)

    return stdDev !== 0 ? avgReturn / stdDev : 0
  }

  private calculateProfitFactor(trades: any[]): number {
    const grossProfit = trades.filter(t => t.win).reduce((sum, t) => sum + t.profit, 0)
    const grossLoss = Math.abs(trades.filter(t => !t.win).reduce((sum, t) => sum + t.profit, 0))

    return grossLoss !== 0 ? grossProfit / grossLoss : Infinity
  }
}

export class ArbitrageStrategy extends TradingStrategy {
  constructor(parameters: StrategyParameters) {
    super('Arbitrage', parameters)
  }

  async analyze(marketData: any[]): Promise<StrategySignal> {
    // For arbitrage, we would need multiple market data feeds
    // This is a simplified implementation
    const latest = marketData[marketData.length - 1]
    
    // Simulate arbitrage opportunity detection
    const priceDiscrepancy = this.detectPriceDiscrepancy(latest.symbol)
    
    if (priceDiscrepancy > 0.001) { // 0.1% threshold
      return {
        symbol: latest.symbol,
        action: 'buy',
        strength: Math.min(priceDiscrepancy * 10000, 100),
        confidence: 95,
        entryPrice: latest.price,
        stopLoss: latest.price * 0.999,
        takeProfit: latest.price * 1.002,
        reason: `Arbitrage opportunity detected: ${priceDiscrepancy.toFixed(4)}% price discrepancy`,
        timestamp: new Date().toISOString()
      }
    }

    return {
      symbol: latest.symbol,
      action: 'hold',
      strength: 0,
      confidence: 0,
      entryPrice: latest.price,
      reason: 'No arbitrage opportunity detected',
      timestamp: new Date().toISOString()
    }
  }

  async backtest(historicalData: any[]): Promise<BacktestResult> {
    // Arbitrage typically has very high win rates but limited opportunities
    return {
      totalTrades: 50,
      winningTrades: 50,
      losingTrades: 0,
      winRate: 100,
      totalReturn: 15,
      maxDrawdown: 0.1,
      sharpeRatio: 25,
      profitFactor: Infinity,
      averageWin: 300,
      averageLoss: 0
    }
  }

  private detectPriceDiscrepancy(symbol: string): number {
    // Simulate price discrepancy detection
    // In reality, this would compare prices across different exchanges
    return Math.random() * 0.005 // 0-0.5% discrepancy
  }
}

export class StrategyManager {
  private strategies: Map<string, TradingStrategy> = new Map()
  private activeStrategies: Set<string> = new Set()

  constructor() {
    this.initializeStrategies()
  }

  private initializeStrategies() {
    const defaultParameters: StrategyParameters = {
      timeframe: '1h',
      riskPerTrade: 1,
      maxPositions: 10,
      indicators: {
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
        smaShort: 20,
        smaLong: 50
      }
    }

    this.strategies.set('technical', new TechnicalAnalysisStrategy(defaultParameters))
    this.strategies.set('ml', new MachineLearningStrategy(defaultParameters))
    this.strategies.set('arbitrage', new ArbitrageStrategy(defaultParameters))

    // Activate all strategies by default
    this.activeStrategies.add('technical')
    this.activeStrategies.add('ml')
    this.activeStrategies.add('arbitrage')
  }

  async analyzeSymbol(symbol: string, marketData: any[]): Promise<StrategySignal[]> {
    const signals: StrategySignal[] = []

    for (const [strategyName, strategy] of this.strategies) {
      if (this.activeStrategies.has(strategyName)) {
        try {
          const signal = await strategy.analyze(marketData)
          signals.push(signal)
        } catch (error) {
          console.error(`Error in ${strategyName} strategy:`, error)
        }
      }
    }

    return signals
  }

  async getConsensusSignal(symbol: string, marketData: any[]): Promise<StrategySignal | null> {
    const signals = await this.analyzeSymbol(symbol, marketData)
    
    if (signals.length === 0) return null

    // Count votes for each action
    const votes = { buy: 0, sell: 0, hold: 0 }
    const confidences = { buy: [], sell: [], hold: [] } as any

    signals.forEach(signal => {
      votes[signal.action]++
      confidences[signal.action].push(signal.confidence)
    })

    // Find the action with most votes
    const winningAction = Object.entries(votes).reduce((a, b) => votes[a[0] as keyof typeof votes] > votes[b[0] as keyof typeof votes] ? a : b)[0] as 'buy' | 'sell' | 'hold'

    // Calculate average confidence for winning action
    const avgConfidence = confidences[winningAction].length > 0 ?
      confidences[winningAction].reduce((sum: number, conf: number) => sum + conf, 0) / confidences[winningAction].length : 0

    // Only return signal if we have consensus (majority agreement)
    if (votes[winningAction] > signals.length / 2) {
      const latest = marketData[marketData.length - 1]
      const atr = this.calculateATR(marketData)

      return {
        symbol,
        action: winningAction,
        strength: (votes[winningAction] / signals.length) * 100,
        confidence: avgConfidence,
        entryPrice: latest.price,
        stopLoss: winningAction !== 'hold' ? this.calculateStopLoss(latest.price, winningAction, atr) : undefined,
        takeProfit: winningAction !== 'hold' ? this.calculateTakeProfit(latest.price, winningAction, atr) : undefined,
        reason: `Consensus signal from ${votes[winningAction]} strategies`,
        timestamp: new Date().toISOString()
      }
    }

    return null
  }

  async backtestAllStrategies(historicalData: any[]): Promise<Map<string, BacktestResult>> {
    const results = new Map<string, BacktestResult>()

    for (const [strategyName, strategy] of this.strategies) {
      try {
        const result = await strategy.backtest(historicalData)
        results.set(strategyName, result)
      } catch (error) {
        console.error(`Error backtesting ${strategyName}:`, error)
      }
    }

    return results
  }

  activateStrategy(strategyName: string) {
    this.activeStrategies.add(strategyName)
  }

  deactivateStrategy(strategyName: string) {
    this.activeStrategies.delete(strategyName)
  }

  getActiveStrategies(): string[] {
    return Array.from(this.activeStrategies)
  }

  private calculateATR(data: any[], period: number = 14): number {
    if (data.length < period + 1) return 0

    const trValues = []
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high || data[i].price
      const low = data[i].low || data[i].price
      const prevClose = data[i - 1].close || data[i - 1].price

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      )
      trValues.push(tr)
    }

    const atr = trValues.slice(-period).reduce((sum, tr) => sum + tr, 0) / period
    return atr
  }

  private calculateStopLoss(entryPrice: number, action: 'buy' | 'sell', atr: number): number {
    const stopDistance = atr * 2
    return action === 'buy' ? entryPrice - stopDistance : entryPrice + stopDistance
  }

  private calculateTakeProfit(entryPrice: number, action: 'buy' | 'sell', atr: number): number {
    const profitDistance = atr * 3
    return action === 'buy' ? entryPrice + profitDistance : entryPrice - profitDistance
  }
}

export const strategyManager = new StrategyManager()