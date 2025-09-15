import { strategyManager } from './trading-strategies'

interface BacktestConfig {
  symbol: string
  strategy: string
  startDate: string
  endDate: string
  initialCapital: number
  parameters: any
}

interface HistoricalData {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface BacktestTrade {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  quantity: number
  entryPrice: number
  exitPrice: number
  entryTime: string
  exitTime: string
  profitLoss: number
  profitLossPercent: number
  fees: number
  status: 'completed' | 'open'
  strategy: string
  reason: string
}

interface BacktestResult {
  summary: {
    totalTrades: number
    winningTrades: number
    losingTrades: number
    winRate: number
    totalReturn: number
    totalReturnPercent: number
    maxDrawdown: number
    maxDrawdownPercent: number
    sharpeRatio: number
    profitFactor: number
    averageWin: number
    averageLoss: number
    largestWin: number
    largestLoss: number
    averageHoldTime: number
  }
  trades: BacktestTrade[]
  equity_curve: Array<{
    timestamp: string
    equity: number
    drawdown: number
  }>
  metrics: {
    calmarRatio: number
    sortinoRatio: number
    winLossRatio: number
    profitFactor: number
    recoveryFactor: number
    riskAdjustedReturn: number
  }
  config: BacktestConfig
}

interface OptimizationResult {
  parameters: any
  result: BacktestResult
  fitness: number
}

export class BacktestingEngine {
  private historicalData: Map<string, HistoricalData[]> = new Map()

  constructor() {
    this.loadHistoricalData()
  }

  private loadHistoricalData() {
    // In a real implementation, this would load from a database or API
    // For now, we'll generate synthetic historical data
    const symbols = ['BTC/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD', 'AAPL', 'TSLA']
    
    symbols.forEach(symbol => {
      this.historicalData.set(symbol, this.generateSyntheticData(symbol))
    })
  }

  private generateSyntheticData(symbol: string, days: number = 365): HistoricalData[] {
    const data: HistoricalData[] = []
    const now = new Date()
    let basePrice = this.getBasePrice(symbol)
    
    // Generate daily data
    for (let i = days; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      // Add some randomness and trends
      const trend = Math.sin(i / 30) * 0.1 // Cyclical trend
      const volatility = this.getVolatility(symbol)
      const dailyChange = (Math.random() - 0.5) * volatility + trend
      
      basePrice = basePrice * (1 + dailyChange)
      
      const dailyVolatility = volatility * 0.5
      const high = basePrice * (1 + Math.random() * dailyVolatility)
      const low = basePrice * (1 - Math.random() * dailyVolatility)
      const open = basePrice * (1 + (Math.random() - 0.5) * dailyVolatility * 0.5)
      const close = basePrice
      
      data.push({
        timestamp: date.toISOString(),
        open: Math.max(open, low),
        high: Math.max(high, open, close),
        low: Math.min(low, open, close),
        close: close,
        volume: Math.floor(Math.random() * 1000000) + 100000
      })
    }
    
    return data
  }

  private getBasePrice(symbol: string): number {
    const prices: { [key: string]: number } = {
      'BTC/USD': 45000,
      'ETH/USD': 3000,
      'EUR/USD': 1.08,
      'GBP/USD': 1.27,
      'AAPL': 180,
      'TSLA': 240
    }
    return prices[symbol] || 100
  }

  private getVolatility(symbol: string): number {
    const volatilities: { [key: string]: number } = {
      'BTC/USD': 0.05,
      'ETH/USD': 0.06,
      'EUR/USD': 0.01,
      'GBP/USD': 0.012,
      'AAPL': 0.02,
      'TSLA': 0.04
    }
    return volatilities[symbol] || 0.02
  }

  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    const historicalData = this.historicalData.get(config.symbol)
    if (!historicalData) {
      throw new Error(`No historical data available for ${config.symbol}`)
    }

    // Filter data by date range
    const startDate = new Date(config.startDate)
    const endDate = new Date(config.endDate)
    const filteredData = historicalData.filter(d => {
      const date = new Date(d.timestamp)
      return date >= startDate && date <= endDate
    })

    if (filteredData.length < 50) {
      throw new Error('Insufficient historical data for backtesting')
    }

    // Initialize backtest state
    let capital = config.initialCapital
    let maxCapital = capital
    let maxDrawdown = 0
    let currentDrawdown = 0
    const trades: BacktestTrade[] = []
    const equityCurve: Array<{ timestamp: string; equity: number; drawdown: number }> = []

    // Simulate trading
    for (let i = 20; i < filteredData.length - 1; i++) {
      const currentData = filteredData.slice(0, i + 1)
      const currentBar = filteredData[i]
      const nextBar = filteredData[i + 1]

      try {
        // Get strategy signal
        const signals = await strategyManager.analyzeSymbol(config.symbol, currentData)
        const consensusSignal = await strategyManager.getConsensusSignal(config.symbol, currentData)

        if (consensusSignal && consensusSignal.action !== 'hold') {
          // Execute trade
          const positionSize = this.calculatePositionSize(capital, consensusSignal)
          const entryPrice = currentBar.close
          const exitPrice = nextBar.close

          const profit = (exitPrice - entryPrice) * positionSize * (consensusSignal.action === 'buy' ? 1 : -1)
          const fees = Math.abs(entryPrice * positionSize * 0.001) // 0.1% fees
          const netProfit = profit - fees

          const trade: BacktestTrade = {
            id: `${config.symbol}-${i}-${Date.now()}`,
            symbol: config.symbol,
            type: consensusSignal.action,
            quantity: positionSize,
            entryPrice,
            exitPrice,
            entryTime: currentBar.timestamp,
            exitTime: nextBar.timestamp,
            profitLoss: netProfit,
            profitLossPercent: (netProfit / (entryPrice * positionSize)) * 100,
            fees,
            status: 'completed',
            strategy: config.strategy,
            reason: consensusSignal.reason
          }

          trades.push(trade)
          capital += netProfit

          // Update drawdown calculations
          maxCapital = Math.max(maxCapital, capital)
          currentDrawdown = ((maxCapital - capital) / maxCapital) * 100
          maxDrawdown = Math.max(maxDrawdown, currentDrawdown)
        }

        // Record equity curve point
        equityCurve.push({
          timestamp: currentBar.timestamp,
          equity: capital,
          drawdown: currentDrawdown
        })

      } catch (error) {
        console.error(`Error processing bar ${i}:`, error)
      }
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(trades, config.initialCapital, capital, maxDrawdown)
    const metrics = this.calculateAdvancedMetrics(trades, summary)

    return {
      summary,
      trades,
      equity_curve: equityCurve,
      metrics,
      config
    }
  }

  private calculatePositionSize(capital: number, signal: any): number {
    // Simple position sizing - risk 1% of capital per trade
    const riskAmount = capital * 0.01
    const estimatedPriceMove = signal.entryPrice * 0.02 // 2% estimated move
    return riskAmount / estimatedPriceMove
  }

  private calculateSummary(trades: BacktestTrade[], initialCapital: number, finalCapital: number, maxDrawdown: number) {
    const winningTrades = trades.filter(t => t.profitLoss > 0)
    const losingTrades = trades.filter(t => t.profitLoss < 0)
    
    const totalReturn = finalCapital - initialCapital
    const totalReturnPercent = (totalReturn / initialCapital) * 100
    
    const averageWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => sum + t.profitLoss, 0) / winningTrades.length : 0
    const averageLoss = losingTrades.length > 0 ? 
      losingTrades.reduce((sum, t) => sum + Math.abs(t.profitLoss), 0) / losingTrades.length : 0

    const largestWin = winningTrades.length > 0 ? 
      Math.max(...winningTrades.map(t => t.profitLoss)) : 0
    const largestLoss = losingTrades.length > 0 ? 
      Math.max(...losingTrades.map(t => Math.abs(t.profitLoss))) : 0

    // Calculate average hold time
    const holdTimes = trades.map(t => {
      const entryTime = new Date(t.entryTime).getTime()
      const exitTime = new Date(t.exitTime).getTime()
      return (exitTime - entryTime) / (1000 * 60 * 60 * 24) // Convert to days
    })
    const averageHoldTime = holdTimes.length > 0 ? 
      holdTimes.reduce((sum, time) => sum + time, 0) / holdTimes.length : 0

    // Calculate Sharpe ratio (simplified)
    const returns = trades.map(t => t.profitLossPercent)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    const sharpeRatio = stdDev !== 0 ? avgReturn / stdDev : 0

    // Calculate profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.profitLoss, 0)
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0))
    const profitFactor = grossLoss !== 0 ? grossProfit / grossLoss : Infinity

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      totalReturn,
      totalReturnPercent,
      maxDrawdown,
      maxDrawdownPercent: maxDrawdown,
      sharpeRatio,
      profitFactor,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      averageHoldTime
    }
  }

  private calculateAdvancedMetrics(trades: BacktestTrade[], summary: any) {
    const winningTrades = trades.filter(t => t.profitLoss > 0)
    const losingTrades = trades.filter(t => t.profitLoss < 0)

    // Calmar Ratio
    const calmarRatio = summary.maxDrawdown !== 0 ? 
      Math.abs(summary.totalReturnPercent) / summary.maxDrawdown : 0

    // Sortino Ratio (only consider downside volatility)
    const negativeReturns = trades.map(t => t.profitLossPercent).filter(r => r < 0)
    const downsideVariance = negativeReturns.length > 0 ? 
      negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length : 0
    const downsideDeviation = Math.sqrt(downsideVariance)
    const sortinoRatio = downsideDeviation !== 0 ? 
      summary.totalReturnPercent / downsideDeviation : 0

    // Win/Loss Ratio
    const winLossRatio = summary.averageLoss !== 0 ? 
      summary.averageWin / summary.averageLoss : 0

    // Recovery Factor
    const recoveryFactor = summary.maxDrawdown !== 0 ? 
      summary.totalReturnPercent / summary.maxDrawdown : 0

    // Risk-Adjusted Return
    const riskAdjustedReturn = summary.maxDrawdown !== 0 ? 
      summary.totalReturnPercent / summary.maxDrawdown : 0

    return {
      calmarRatio,
      sortinoRatio,
      winLossRatio,
      profitFactor: summary.profitFactor,
      recoveryFactor,
      riskAdjustedReturn
    }
  }

  async optimizeStrategy(config: BacktestConfig, parameterRanges: any): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = []
    
    // Generate parameter combinations
    const parameterCombinations = this.generateParameterCombinations(parameterRanges)
    
    for (const parameters of parameterCombinations) {
      try {
        const testConfig = { ...config, parameters }
        const result = await this.runBacktest(testConfig)
        
        // Calculate fitness score (higher is better)
        const fitness = this.calculateFitness(result)
        
        results.push({
          parameters,
          result,
          fitness
        })
      } catch (error) {
        console.error('Error in optimization run:', error)
      }
    }

    // Sort by fitness (descending)
    return results.sort((a, b) => b.fitness - a.fitness)
  }

  private generateParameterCombinations(ranges: any): any[] {
    const combinations: any[] = []
    const keys = Object.keys(ranges)
    
    if (keys.length === 0) return [{}]
    
    const firstKey = keys[0]
    const remainingKeys = keys.slice(1)
    const remainingRanges = remainingKeys.reduce((obj, key) => ({ ...obj, [key]: ranges[key] }), {})
    
    for (const value of ranges[firstKey]) {
      const remainingCombinations = this.generateParameterCombinations(remainingRanges)
      
      for (const combination of remainingCombinations) {
        combinations.push({
          [firstKey]: value,
          ...combination
        })
      }
    }
    
    return combinations
  }

  private calculateFitness(result: BacktestResult): number {
    const { summary, metrics } = result
    
    // Weighted fitness score
    const weights = {
      totalReturn: 0.3,
      winRate: 0.25,
      sharpeRatio: 0.2,
      maxDrawdown: 0.15,
      profitFactor: 0.1
    }
    
    // Normalize metrics (0-1 scale)
    const normalizedReturn = Math.min(Math.max(summary.totalReturnPercent / 100, 0), 1)
    const normalizedWinRate = summary.winRate / 100
    const normalizedSharpe = Math.min(Math.max(summary.sharpeRatio / 3, 0), 1)
    const normalizedDrawdown = Math.max(1 - (summary.maxDrawdown / 50), 0)
    const normalizedProfitFactor = Math.min(Math.max(summary.profitFactor / 3, 0), 1)
    
    const fitness = 
      (normalizedReturn * weights.totalReturn) +
      (normalizedWinRate * weights.winRate) +
      (normalizedSharpe * weights.sharpeRatio) +
      (normalizedDrawdown * weights.maxDrawdown) +
      (normalizedProfitFactor * weights.profitFactor)
    
    return fitness
  }

  generateBacktestReport(result: BacktestResult): string {
    const { summary, metrics, config } = result
    
    return `
# Backtest Report for ${config.symbol}

## Configuration
- Strategy: ${config.strategy}
- Period: ${config.startDate} to ${config.endDate}
- Initial Capital: $${config.initialCapital.toLocaleString()}

## Performance Summary
- Total Return: ${summary.totalReturnPercent.toFixed(2)}%
- Win Rate: ${summary.winRate.toFixed(2)}%
- Total Trades: ${summary.totalTrades}
- Max Drawdown: ${summary.maxDrawdown.toFixed(2)}%
- Sharpe Ratio: ${summary.sharpeRatio.toFixed(2)}
- Profit Factor: ${summary.profitFactor.toFixed(2)}

## Trade Statistics
- Winning Trades: ${summary.winningTrades}
- Losing Trades: ${summary.losingTrades}
- Average Win: $${summary.averageWin.toFixed(2)}
- Average Loss: $${summary.averageLoss.toFixed(2)}
- Largest Win: $${summary.largestWin.toFixed(2)}
- Largest Loss: $${summary.largestLoss.toFixed(2)}
- Average Hold Time: ${summary.averageHoldTime.toFixed(2)} days

## Risk Metrics
- Calmar Ratio: ${metrics.calmarRatio.toFixed(2)}
- Sortino Ratio: ${metrics.sortinoRatio.toFixed(2)}
- Win/Loss Ratio: ${metrics.winLossRatio.toFixed(2)}
- Recovery Factor: ${metrics.recoveryFactor.toFixed(2)}
- Risk-Adjusted Return: ${metrics.riskAdjustedReturn.toFixed(2)}

## Recommendations
${this.generateRecommendations(result)}
    `.trim()
  }

  private generateRecommendations(result: BacktestResult): string {
    const recommendations: string[] = []
    const { summary, metrics } = result

    if (summary.winRate < 60) {
      recommendations.push("- Consider refining entry/exit criteria to improve win rate")
    }

    if (summary.maxDrawdown > 20) {
      recommendations.push("- Implement stricter risk management to reduce drawdowns")
    }

    if (summary.sharpeRatio < 1) {
      recommendations.push("- Strategy shows low risk-adjusted returns - consider optimization")
    }

    if (summary.profitFactor < 1.5) {
      recommendations.push("- Profit factor is low - focus on improving win rate or average win size")
    }

    if (summary.averageHoldTime < 1) {
      recommendations.push("- Very short holding periods may indicate over-trading")
    }

    if (recommendations.length === 0) {
      recommendations.push("- Strategy shows good performance across all metrics")
    }

    return recommendations.join('\n')
  }

  getAvailableSymbols(): string[] {
    return Array.from(this.historicalData.keys())
  }

  getHistoricalData(symbol: string): HistoricalData[] | undefined {
    return this.historicalData.get(symbol)
  }
}

export const backtestingEngine = new BacktestingEngine()