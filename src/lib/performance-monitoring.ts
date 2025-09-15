interface PerformanceMetrics {
  totalReturn: number
  totalReturnPercent: number
  dailyReturn: number
  weeklyReturn: number
  monthlyReturn: number
  yearlyReturn: number
  winRate: number
  profitFactor: number
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  maxDrawdown: number
  maxDrawdownPercent: number
  currentDrawdown: number
  currentDrawdownPercent: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  averageHoldTime: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  consecutiveWins: number
  consecutiveLosses: number
  beta: number
  alpha: number
  informationRatio: number
  treynorRatio: number
}

interface TradePerformance {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  entryPrice: number
  exitPrice: number
  quantity: number
  entryTime: string
  exitTime: string
  profitLoss: number
  profitLossPercent: number
  fees: number
  holdTime: number
  strategy: string
  riskScore: number
  marketConditions: {
    volatility: number
    trend: 'up' | 'down' | 'sideways'
    volume: number
  }
}

interface StrategyPerformance {
  strategyName: string
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalReturn: number
  totalReturnPercent: number
  sharpeRatio: number
  maxDrawdown: number
  averageWin: number
  averageLoss: number
  profitFactor: number
  currentStreak: number
  bestStreak: number
  worstStreak: number
  lastUpdated: string
}

interface PortfolioPerformance {
  overall: PerformanceMetrics
  byStrategy: Map<string, StrategyPerformance>
  bySymbol: Map<string, PerformanceMetrics>
  byTimeframe: {
    daily: PerformanceMetrics
    weekly: PerformanceMetrics
    monthly: PerformanceMetrics
    yearly: PerformanceMetrics
  }
  equityCurve: Array<{
    timestamp: string
    equity: number
    drawdown: number
  }>
  riskMetrics: {
    variance: number
    standardDeviation: number
    downsideDeviation: number
    valueAtRisk: number
    expectedShortfall: number
    beta: number
    correlation: number
  }
}

export class PerformanceMonitoringService {
  private tradeHistory: TradePerformance[] = []
  private portfolioPerformance: PortfolioPerformance
  private benchmarkData: Map<string, number[]> = new Map()

  constructor() {
    this.portfolioPerformance = this.initializePortfolioPerformance()
    this.loadBenchmarkData()
    this.startRealTimeUpdates()
  }

  private initializePortfolioPerformance(): PortfolioPerformance {
    return {
      overall: this.getEmptyMetrics(),
      byStrategy: new Map(),
      bySymbol: new Map(),
      byTimeframe: {
        daily: this.getEmptyMetrics(),
        weekly: this.getEmptyMetrics(),
        monthly: this.getEmptyMetrics(),
        yearly: this.getEmptyMetrics()
      },
      equityCurve: [],
      riskMetrics: {
        variance: 0,
        standardDeviation: 0,
        downsideDeviation: 0,
        valueAtRisk: 0,
        expectedShortfall: 0,
        beta: 1.0,
        correlation: 0
      }
    }
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      totalReturnPercent: 0,
      dailyReturn: 0,
      weeklyReturn: 0,
      monthlyReturn: 0,
      yearlyReturn: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      currentDrawdown: 0,
      currentDrawdownPercent: 0,
      averageWin: 0,
      averageLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      averageHoldTime: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      beta: 1.0,
      alpha: 0,
      informationRatio: 0,
      treynorRatio: 0
    }
  }

  private loadBenchmarkData() {
    // Load benchmark data for comparison (e.g., S&P 500, BTC, etc.)
    const benchmarks = ['SPY', 'BTC', 'EUR_USD']
    
    benchmarks.forEach(benchmark => {
      const data = []
      const baseValue = benchmark === 'SPY' ? 400 : benchmark === 'BTC' ? 45000 : 1.08
      
      // Generate synthetic benchmark data
      for (let i = 0; i < 365; i++) {
        const change = (Math.random() - 0.5) * 0.02 // 2% daily volatility
        const value = i === 0 ? baseValue : data[data.length - 1] * (1 + change)
        data.push(value)
      }
      
      this.benchmarkData.set(benchmark, data)
    })
  }

  private startRealTimeUpdates() {
    // Update performance metrics every minute
    setInterval(() => {
      this.updatePerformanceMetrics()
    }, 60000)
  }

  addTrade(trade: Partial<TradePerformance>): void {
    const completeTrade: TradePerformance = {
      id: trade.id || `trade_${Date.now()}`,
      symbol: trade.symbol || '',
      type: trade.type || 'buy',
      entryPrice: trade.entryPrice || 0,
      exitPrice: trade.exitPrice || 0,
      quantity: trade.quantity || 0,
      entryTime: trade.entryTime || new Date().toISOString(),
      exitTime: trade.exitTime || new Date().toISOString(),
      profitLoss: trade.profitLoss || 0,
      profitLossPercent: trade.profitLossPercent || 0,
      fees: trade.fees || 0,
      holdTime: trade.holdTime || 0,
      strategy: trade.strategy || 'unknown',
      riskScore: trade.riskScore || 0,
      marketConditions: trade.marketConditions || {
        volatility: 0.02,
        trend: 'sideways',
        volume: 1000000
      }
    }

    this.tradeHistory.push(completeTrade)
    this.updatePerformanceMetrics()
  }

  private updatePerformanceMetrics(): void {
    // Update overall performance
    this.portfolioPerformance.overall = this.calculateMetrics(this.tradeHistory)

    // Update by strategy
    const strategies = new Set(this.tradeHistory.map(t => t.strategy))
    strategies.forEach(strategy => {
      const strategyTrades = this.tradeHistory.filter(t => t.strategy === strategy)
      this.portfolioPerformance.byStrategy.set(strategy, this.calculateStrategyMetrics(strategyTrades))
    })

    // Update by symbol
    const symbols = new Set(this.tradeHistory.map(t => t.symbol))
    symbols.forEach(symbol => {
      const symbolTrades = this.tradeHistory.filter(t => t.symbol === symbol)
      this.portfolioPerformance.bySymbol.set(symbol, this.calculateMetrics(symbolTrades))
    })

    // Update equity curve
    this.updateEquityCurve()

    // Update risk metrics
    this.updateRiskMetrics()
  }

  private calculateMetrics(trades: TradePerformance[]): PerformanceMetrics {
    if (trades.length === 0) return this.getEmptyMetrics()

    const winningTrades = trades.filter(t => t.profitLoss > 0)
    const losingTrades = trades.filter(t => t.profitLoss < 0)

    const totalReturn = trades.reduce((sum, t) => sum + t.profitLoss, 0)
    const totalReturnPercent = trades.length > 0 ? (totalReturn / trades.reduce((sum, t) => sum + (t.entryPrice * t.quantity), 0)) * 100 : 0

    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0

    const averageWin = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => sum + t.profitLoss, 0) / winningTrades.length : 0
    const averageLoss = losingTrades.length > 0 ? 
      Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0)) / losingTrades.length : 0

    const largestWin = winningTrades.length > 0 ? 
      Math.max(...winningTrades.map(t => t.profitLoss)) : 0
    const largestLoss = losingTrades.length > 0 ? 
      Math.max(...losingTrades.map(t => Math.abs(t.profitLoss))) : 0

    const averageHoldTime = trades.length > 0 ? 
      trades.reduce((sum, t) => sum + t.holdTime, 0) / trades.length : 0

    const profitFactor = averageLoss > 0 ? averageWin / averageLoss : Infinity

    // Calculate drawdown
    const equityCurve = this.calculateEquityCurve(trades)
    const maxDrawdown = this.calculateMaxDrawdown(equityCurve)
    const currentDrawdown = this.calculateCurrentDrawdown(equityCurve)

    // Calculate returns for different timeframes
    const now = new Date()
    const dailyReturn = this.calculateTimeframeReturn(trades, new Date(now.getTime() - 24 * 60 * 60 * 1000))
    const weeklyReturn = this.calculateTimeframeReturn(trades, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
    const monthlyReturn = this.calculateTimeframeReturn(trades, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
    const yearlyReturn = this.calculateTimeframeReturn(trades, new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000))

    // Calculate risk-adjusted metrics
    const returns = trades.map(t => t.profitLossPercent)
    const sharpeRatio = this.calculateSharpeRatio(returns)
    const sortinoRatio = this.calculateSortinoRatio(returns)
    const calmarRatio = maxDrawdown > 0 ? Math.abs(totalReturnPercent) / maxDrawdown : 0

    // Calculate streaks
    const streaks = this.calculateStreaks(trades)
    const consecutiveWins = streaks.currentWinStreak
    const consecutiveLosses = streaks.currentLossStreak

    // Calculate beta and alpha (simplified)
    const beta = this.calculateBeta(trades)
    const alpha = this.calculateAlpha(trades, beta)

    // Calculate additional ratios
    const informationRatio = this.calculateInformationRatio(trades)
    const treynorRatio = this.calculateTreynorRatio(trades, beta)

    return {
      totalReturn,
      totalReturnPercent,
      dailyReturn,
      weeklyReturn,
      monthlyReturn,
      yearlyReturn,
      winRate,
      profitFactor,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown,
      maxDrawdownPercent: maxDrawdown,
      currentDrawdown,
      currentDrawdownPercent: currentDrawdown,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      averageHoldTime,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      consecutiveWins,
      consecutiveLosses,
      beta,
      alpha,
      informationRatio,
      treynorRatio
    }
  }

  private calculateStrategyMetrics(trades: TradePerformance[]): StrategyPerformance {
    const metrics = this.calculateMetrics(trades)
    const streaks = this.calculateStreaks(trades)

    return {
      strategyName: trades[0]?.strategy || 'unknown',
      totalTrades: metrics.totalTrades,
      winningTrades: metrics.winningTrades,
      losingTrades: metrics.losingTrades,
      winRate: metrics.winRate,
      totalReturn: metrics.totalReturn,
      totalReturnPercent: metrics.totalReturnPercent,
      sharpeRatio: metrics.sharpeRatio,
      maxDrawdown: metrics.maxDrawdown,
      averageWin: metrics.averageWin,
      averageLoss: metrics.averageLoss,
      profitFactor: metrics.profitFactor,
      currentStreak: streaks.currentWinStreak > 0 ? streaks.currentWinStreak : -streaks.currentLossStreak,
      bestStreak: streaks.bestWinStreak,
      worstStreak: streaks.worstLossStreak,
      lastUpdated: new Date().toISOString()
    }
  }

  private calculateEquityCurve(trades: TradePerformance[]): number[] {
    const sortedTrades = [...trades].sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime())
    const equity = [100000] // Starting with $100k

    sortedTrades.forEach(trade => {
      const lastEquity = equity[equity.length - 1]
      equity.push(lastEquity + trade.profitLoss)
    })

    return equity
  }

  private updateEquityCurve(): void {
    const equity = this.calculateEquityCurve(this.tradeHistory)
    const drawdowns = this.calculateDrawdowns(equity)

    this.portfolioPerformance.equityCurve = equity.map((value, index) => ({
      timestamp: new Date(Date.now() - (equity.length - index) * 60000).toISOString(), // Assume 1 minute intervals
      equity: value,
      drawdown: drawdowns[index]
    }))
  }

  private calculateDrawdowns(equity: number[]): number[] {
    const drawdowns: number[] = []
    let peak = equity[0]

    equity.forEach(value => {
      if (value > peak) {
        peak = value
      }
      const drawdown = ((peak - value) / peak) * 100
      drawdowns.push(drawdown)
    })

    return drawdowns
  }

  private calculateMaxDrawdown(equity: number[]): number {
    const drawdowns = this.calculateDrawdowns(equity)
    return Math.max(...drawdowns)
  }

  private calculateCurrentDrawdown(equity: number[]): number {
    const drawdowns = this.calculateDrawdowns(equity)
    return drawdowns[drawdowns.length - 1]
  }

  private calculateTimeframeReturn(trades: TradePerformance[], since: Date): number {
    const timeframeTrades = trades.filter(t => new Date(t.exitTime) >= since)
    return timeframeTrades.reduce((sum, t) => sum + t.profitLoss, 0)
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)

    return stdDev !== 0 ? avgReturn / stdDev : 0
  }

  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const negativeReturns = returns.filter(r => r < 0)
    
    if (negativeReturns.length === 0) return Infinity

    const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
    const downsideDeviation = Math.sqrt(downsideVariance)

    return downsideDeviation !== 0 ? avgReturn / downsideDeviation : 0
  }

  private calculateStreaks(trades: TradePerformance[]): {
    currentWinStreak: number
    currentLossStreak: number
    bestWinStreak: number
    worstLossStreak: number
  } {
    const sortedTrades = [...trades].sort((a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime())
    
    let currentWinStreak = 0
    let currentLossStreak = 0
    let bestWinStreak = 0
    let worstLossStreak = 0

    for (let i = 0; i < sortedTrades.length; i++) {
      const trade = sortedTrades[i]
      
      if (trade.profitLoss > 0) {
        currentWinStreak++
        currentLossStreak = 0
        bestWinStreak = Math.max(bestWinStreak, currentWinStreak)
      } else {
        currentLossStreak++
        currentWinStreak = 0
        worstLossStreak = Math.max(worstLossStreak, currentLossStreak)
      }
    }

    return { currentWinStreak, currentLossStreak, bestWinStreak, worstLossStreak }
  }

  private calculateBeta(trades: TradePerformance[]): number {
    // Simplified beta calculation - would need market data for accurate calculation
    return 1.0 + (Math.random() - 0.5) * 0.4 // Random beta between 0.8 and 1.2
  }

  private calculateAlpha(trades: TradePerformance[], beta: number): number {
    const totalReturn = trades.reduce((sum, t) => sum + t.profitLossPercent, 0) / trades.length
    const marketReturn = 0.08 // Assume 8% annual market return
    return totalReturn - (marketReturn * beta)
  }

  private calculateInformationRatio(trades: TradePerformance[]): number {
    // Simplified information ratio
    const returns = trades.map(t => t.profitLossPercent)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const trackingError = 0.15 // Assume 15% tracking error
    
    return trackingError !== 0 ? avgReturn / trackingError : 0
  }

  private calculateTreynorRatio(trades: TradePerformance[], beta: number): number {
    const totalReturn = trades.reduce((sum, t) => sum + t.profitLossPercent, 0) / trades.length
    const riskFreeRate = 0.02 // Assume 2% risk-free rate
    
    return beta !== 0 ? (totalReturn - riskFreeRate) / beta : 0
  }

  private updateRiskMetrics(): void {
    const returns = this.tradeHistory.map(t => t.profitLossPercent)
    
    if (returns.length === 0) return

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const standardDeviation = Math.sqrt(variance)

    const negativeReturns = returns.filter(r => r < 0)
    const downsideVariance = negativeReturns.length > 0 ? 
      negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length : 0
    const downsideDeviation = Math.sqrt(downsideVariance)

    // Calculate Value at Risk (95% confidence)
    const sortedReturns = [...returns].sort((a, b) => a - b)
    const varIndex = Math.floor(sortedReturns.length * 0.05)
    const valueAtRisk = sortedReturns[varIndex] || 0

    // Calculate Expected Shortfall (CVaR)
    const tailReturns = sortedReturns.slice(0, varIndex + 1)
    const expectedShortfall = tailReturns.length > 0 ? 
      tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length : 0

    this.portfolioPerformance.riskMetrics = {
      variance,
      standardDeviation,
      downsideDeviation,
      valueAtRisk,
      expectedShortfall,
      beta: this.portfolioPerformance.overall.beta,
      correlation: 0.7 // Simplified correlation
    }
  }

  // Public methods
  getPerformanceReport(): PortfolioPerformance {
    return { ...this.portfolioPerformance }
  }

  getStrategyPerformance(strategyName: string): StrategyPerformance | undefined {
    return this.portfolioPerformance.byStrategy.get(strategyName)
  }

  getSymbolPerformance(symbol: string): PerformanceMetrics | undefined {
    return this.portfolioPerformance.bySymbol.get(symbol)
  }

  getTopPerformingStrategies(limit: number = 5): Array<{
    strategy: string
    return: number
    winRate: number
    sharpeRatio: number
  }> {
    return Array.from(this.portfolioPerformance.byStrategy.entries())
      .map(([strategy, perf]) => ({
        strategy,
        return: perf.totalReturnPercent,
        winRate: perf.winRate,
        sharpeRatio: perf.sharpeRatio
      }))
      .sort((a, b) => b.return - a.return)
      .slice(0, limit)
  }

  getWorstPerformingStrategies(limit: number = 5): Array<{
    strategy: string
    return: number
    winRate: number
    sharpeRatio: number
  }> {
    return Array.from(this.portfolioPerformance.byStrategy.entries())
      .map(([strategy, perf]) => ({
        strategy,
        return: perf.totalReturnPercent,
        winRate: perf.winRate,
        sharpeRatio: perf.sharpeRatio
      }))
      .sort((a, b) => a.return - b.return)
      .slice(0, limit)
  }

  generatePerformanceReport(): string {
    const { overall, byStrategy, riskMetrics } = this.portfolioPerformance

    return `
# Performance Report

## Overall Performance
- Total Return: ${overall.totalReturnPercent.toFixed(2)}%
- Win Rate: ${overall.winRate.toFixed(2)}%
- Sharpe Ratio: ${overall.sharpeRatio.toFixed(2)}
- Max Drawdown: ${overall.maxDrawdownPercent.toFixed(2)}%
- Profit Factor: ${overall.profitFactor.toFixed(2)}

## Risk Metrics
- Standard Deviation: ${(riskMetrics.standardDeviation * 100).toFixed(2)}%
- Value at Risk (95%): ${(riskMetrics.valueAtRisk * 100).toFixed(2)}%
- Beta: ${riskMetrics.beta.toFixed(2)}
- Alpha: ${overall.alpha.toFixed(2)}%

## Strategy Performance
${Array.from(byStrategy.entries()).map(([strategy, perf]) => `
### ${strategy}
- Return: ${perf.totalReturnPercent.toFixed(2)}%
- Win Rate: ${perf.winRate.toFixed(2)}%
- Sharpe: ${perf.sharpeRatio.toFixed(2)}
- Max DD: ${perf.maxDrawdown.toFixed(2)}%
`).join('')}

## Recommendations
${this.generateRecommendations()}
    `.trim()
  }

  private generateRecommendations(): string {
    const { overall, byStrategy, riskMetrics } = this.portfolioPerformance
    const recommendations: string[] = []

    if (overall.winRate < 60) {
      recommendations.push("- Consider reviewing entry/exit criteria to improve win rate")
    }

    if (overall.maxDrawdownPercent > 15) {
      recommendations.push("- Implement stricter risk management to reduce drawdowns")
    }

    if (overall.sharpeRatio < 1) {
      recommendations.push("- Strategy shows low risk-adjusted returns - consider optimization")
    }

    if (riskMetrics.standardDeviation > 0.2) {
      recommendations.push("- High volatility detected - consider reducing position sizes")
    }

    if (overall.profitFactor < 1.5) {
      recommendations.push("- Profit factor is low - focus on improving win rate or average win size")
    }

    if (recommendations.length === 0) {
      recommendations.push("- Performance metrics are within acceptable ranges")
    }

    return recommendations.join('\n')
  }

  exportPerformanceData(): {
    trades: TradePerformance[]
    performance: PortfolioPerformance
    exportDate: string
  } {
    return {
      trades: this.tradeHistory,
      performance: this.portfolioPerformance,
      exportDate: new Date().toISOString()
    }
  }

  clearTradeHistory(): void {
    this.tradeHistory = []
    this.portfolioPerformance = this.initializePortfolioPerformance()
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService()