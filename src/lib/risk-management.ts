interface RiskParameters {
  maxPositionSize: number // Maximum position size as percentage of portfolio
  maxPortfolioRisk: number // Maximum portfolio risk as percentage
  maxDailyLoss: number // Maximum daily loss as percentage
  stopLossPercent: number // Default stop loss percentage
  takeProfitPercent: number // Default take profit percentage
  maxCorrelatedPositions: number // Maximum number of correlated positions
  leverage: number // Maximum leverage allowed
  riskPerTrade: number // Risk per trade as percentage
}

interface Position {
  symbol: string
  quantity: number
  entryPrice: number
  currentPrice: number
  unrealizedPnL: number
  type: 'long' | 'short'
  correlationGroup?: string
}

interface Portfolio {
  totalValue: number
  availableCash: number
  dailyPnL: number
  positions: Position[]
}

interface RiskAssessment {
  canExecute: boolean
  reason?: string
  suggestedQuantity?: number
  riskScore: number
  warnings: string[]
}

interface CorrelationMatrix {
  [symbol: string]: {
    [symbol: string]: number
  }
}

export class RiskManagementService {
  private parameters: RiskParameters
  private correlationMatrix: CorrelationMatrix

  constructor(parameters: RiskParameters) {
    this.parameters = parameters
    this.correlationMatrix = this.initializeCorrelationMatrix()
  }

  private initializeCorrelationMatrix(): CorrelationMatrix {
    // Simplified correlation matrix - in reality, this would be calculated from historical data
    return {
      'BTC/USD': {
        'ETH/USD': 0.85,
        'BNB/USD': 0.75,
        'SOL/USD': 0.80,
        'EUR/USD': 0.15,
        'GBP/USD': 0.12,
        'XAU/USD': 0.25
      },
      'ETH/USD': {
        'BTC/USD': 0.85,
        'BNB/USD': 0.82,
        'SOL/USD': 0.88,
        'EUR/USD': 0.18,
        'GBP/USD': 0.14,
        'XAU/USD': 0.22
      },
      'EUR/USD': {
        'GBP/USD': 0.90,
        'AUD/USD': 0.75,
        'USD/JPY': -0.40,
        'BTC/USD': 0.15,
        'ETH/USD': 0.18
      },
      'GBP/USD': {
        'EUR/USD': 0.90,
        'AUD/USD': 0.70,
        'USD/JPY': -0.35,
        'BTC/USD': 0.12,
        'ETH/USD': 0.14
      }
    }
  }

  assessTradeRisk(
    symbol: string,
    action: 'buy' | 'sell',
    suggestedQuantity: number,
    entryPrice: number,
    stopLoss?: number,
    portfolio: Portfolio
  ): RiskAssessment {
    const warnings: string[] = []
    let riskScore = 0
    let canExecute = true
    let finalQuantity = suggestedQuantity

    // 1. Check position size limits
    const positionValue = suggestedQuantity * entryPrice
    const maxPositionValue = (portfolio.totalValue * this.parameters.maxPositionSize) / 100
    
    if (positionValue > maxPositionValue) {
      warnings.push(`Position size exceeds maximum of ${this.parameters.maxPositionSize}% of portfolio`)
      finalQuantity = maxPositionValue / entryPrice
      riskScore += 30
    }

    // 2. Check portfolio risk limits
    const portfolioRisk = this.calculatePortfolioRisk(portfolio, symbol, action, finalQuantity, entryPrice, stopLoss)
    if (portfolioRisk > this.parameters.maxPortfolioRisk) {
      warnings.push(`Portfolio risk exceeds maximum of ${this.parameters.maxPortfolioRisk}%`)
      canExecute = false
      riskScore += 50
    }

    // 3. Check daily loss limits
    if (portfolio.dailyPnL < 0) {
      const dailyLossPercent = (Math.abs(portfolio.dailyPnL) / portfolio.totalValue) * 100
      if (dailyLossPercent >= this.parameters.maxDailyLoss) {
        warnings.push(`Daily loss limit of ${this.parameters.maxDailyLoss}% reached`)
        canExecute = false
        riskScore += 70
      }
    }

    // 4. Check correlation limits
    const correlationRisk = this.assessCorrelationRisk(symbol, portfolio.positions)
    if (correlationRisk.exceedsLimit) {
      warnings.push(`Too many correlated positions (${correlationRisk.count} > ${this.parameters.maxCorrelatedPositions})`)
      canExecute = false
      riskScore += 40
    }

    // 5. Check leverage limits
    const totalExposure = portfolio.positions.reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0)
    const newExposure = totalExposure + (finalQuantity * entryPrice)
    const leverage = newExposure / portfolio.totalValue
    
    if (leverage > this.parameters.leverage) {
      warnings.push(`Leverage exceeds maximum of ${this.parameters.leverage}x`)
      canExecute = false
      riskScore += 60
    }

    // 6. Check available cash
    const requiredCash = finalQuantity * entryPrice
    if (requiredCash > portfolio.availableCash) {
      warnings.push('Insufficient available cash')
      canExecute = false
      riskScore += 80
    }

    // 7. Check risk per trade
    if (stopLoss) {
      const riskAmount = Math.abs(entryPrice - stopLoss) * finalQuantity
      const riskPercent = (riskAmount / portfolio.totalValue) * 100
      
      if (riskPercent > this.parameters.riskPerTrade) {
        warnings.push(`Risk per trade exceeds ${this.parameters.riskPerTrade}% of portfolio`)
        const adjustedQuantity = (portfolio.totalValue * this.parameters.riskPerTrade / 100) / Math.abs(entryPrice - stopLoss)
        finalQuantity = Math.min(finalQuantity, adjustedQuantity)
        riskScore += 20
      }
    }

    // 8. Adjust risk score based on market conditions
    riskScore += this.assessMarketConditionsRisk(symbol)

    return {
      canExecute,
      reason: warnings.length > 0 ? warnings.join('; ') : undefined,
      suggestedQuantity: finalQuantity,
      riskScore: Math.min(riskScore, 100),
      warnings
    }
  }

  private calculatePortfolioRisk(
    portfolio: Portfolio,
    symbol: string,
    action: 'buy' | 'sell',
    quantity: number,
    entryPrice: number,
    stopLoss?: number
  ): number {
    let totalRisk = 0

    // Calculate risk from existing positions
    portfolio.positions.forEach(position => {
      const positionRisk = Math.abs(position.unrealizedPnL) / portfolio.totalValue
      totalRisk += positionRisk
    })

    // Calculate risk from new position
    if (stopLoss) {
      const newRiskAmount = Math.abs(entryPrice - stopLoss) * quantity
      const newRiskPercent = (newRiskAmount / portfolio.totalValue) * 100
      totalRisk += newRiskPercent
    }

    return totalRisk
  }

  private assessCorrelationRisk(symbol: string, existingPositions: Position[]): { exceedsLimit: boolean; count: number } {
    const correlationThreshold = 0.7
    let correlatedCount = 0

    existingPositions.forEach(position => {
      const correlation = this.correlationMatrix[symbol]?.[position.symbol] || 0
      if (Math.abs(correlation) > correlationThreshold) {
        correlatedCount++
      }
    })

    return {
      exceedsLimit: correlatedCount >= this.parameters.maxCorrelatedPositions,
      count: correlatedCount
    }
  }

  private assessMarketConditionsRisk(symbol: string): number {
    // Simplified market conditions risk assessment
    // In reality, this would use volatility, liquidity, and other factors
    
    const volatilityRisk = {
      'BTC/USD': 15,
      'ETH/USD': 18,
      'SOL/USD': 20,
      'EUR/USD': 5,
      'GBP/USD': 6,
      'USD/JPY': 7,
      'XAU/USD': 8,
      'XAG/USD': 12,
      'CL/USD': 10,
      'AAPL': 8,
      'TSLA': 25
    }

    return volatilityRisk[symbol as keyof typeof volatilityRisk] || 10
  }

  calculateOptimalPositionSize(
    symbol: string,
    entryPrice: number,
    stopLoss: number,
    portfolioValue: number,
    riskTolerance: number = 1
  ): number {
    const riskPerShare = Math.abs(entryPrice - stopLoss)
    const maxRiskAmount = (portfolioValue * this.parameters.riskPerTrade * riskTolerance) / 100
    
    return maxRiskAmount / riskPerShare
  }

  generateStopLossLevels(
    symbol: string,
    entryPrice: number,
    action: 'buy' | 'sell',
    volatility: number,
    atr?: number
  ): { stopLoss: number; takeProfit: number } {
    let stopLoss: number
    let takeProfit: number

    if (atr) {
      // Use ATR-based stops
      const stopDistance = atr * 2
      const profitDistance = atr * 3
      
      if (action === 'buy') {
        stopLoss = entryPrice - stopDistance
        takeProfit = entryPrice + profitDistance
      } else {
        stopLoss = entryPrice + stopDistance
        takeProfit = entryPrice - profitDistance
      }
    } else {
      // Use percentage-based stops
      if (action === 'buy') {
        stopLoss = entryPrice * (1 - this.parameters.stopLossPercent / 100)
        takeProfit = entryPrice * (1 + this.parameters.takeProfitPercent / 100)
      } else {
        stopLoss = entryPrice * (1 + this.parameters.stopLossPercent / 100)
        takeProfit = entryPrice * (1 - this.parameters.takeProfitPercent / 100)
      }
    }

    return { stopLoss, takeProfit }
  }

  calculatePortfolioMetrics(portfolio: Portfolio): {
    totalExposure: number
    leverage: number
    riskScore: number
    diversificationScore: number
    cashRatio: number
  } {
    const totalExposure = portfolio.positions.reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0)
    const leverage = totalExposure / portfolio.totalValue
    const cashRatio = (portfolio.availableCash / portfolio.totalValue) * 100

    // Calculate risk score
    let riskScore = 0
    if (leverage > this.parameters.leverage * 0.8) riskScore += 30
    if (cashRatio < 10) riskScore += 20
    if (portfolio.dailyPnL < 0) {
      const dailyLossPercent = (Math.abs(portfolio.dailyPnL) / portfolio.totalValue) * 100
      if (dailyLossPercent > this.parameters.maxDailyLoss * 0.8) riskScore += 40
    }

    // Calculate diversification score
    const assetTypes = new Set(portfolio.positions.map(pos => this.getAssetType(pos.symbol)))
    const diversificationScore = Math.min((assetTypes.size / 4) * 100, 100)

    return {
      totalExposure,
      leverage,
      riskScore: Math.min(riskScore, 100),
      diversificationScore,
      cashRatio
    }
  }

  private getAssetType(symbol: string): string {
    if (symbol.includes('/')) {
      if (['EUR', 'GBP', 'USD', 'JPY', 'AUD'].some(curr => symbol.includes(curr))) {
        return 'forex'
      }
      if (['BTC', 'ETH', 'BNB', 'SOL'].some(crypto => symbol.includes(crypto))) {
        return 'crypto'
      }
      if (['XAU', 'XAG', 'CL', 'NG'].some(comm => symbol.includes(comm))) {
        return 'commodity'
      }
    }
    return 'stock'
  }

  generateRiskReport(portfolio: Portfolio): {
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical'
    keyMetrics: any
    recommendations: string[]
    alerts: string[]
  } {
    const metrics = this.calculatePortfolioMetrics(portfolio)
    const alerts: string[] = []
    const recommendations: string[] = []

    // Generate alerts
    if (metrics.leverage > this.parameters.leverage * 0.9) {
      alerts.push('Leverage approaching maximum limit')
    }
    if (metrics.cashRatio < 5) {
      alerts.push('Low cash reserves - consider reducing positions')
    }
    if (portfolio.dailyPnL < 0) {
      const dailyLossPercent = (Math.abs(portfolio.dailyPnL) / portfolio.totalValue) * 100
      if (dailyLossPercent > this.parameters.maxDailyLoss * 0.9) {
        alerts.push('Approaching daily loss limit')
      }
    }

    // Generate recommendations
    if (metrics.diversificationScore < 50) {
      recommendations.push('Consider diversifying across different asset classes')
    }
    if (metrics.cashRatio > 30) {
      recommendations.push('Consider deploying more capital to take advantage of opportunities')
    }
    if (metrics.riskScore > 60) {
      recommendations.push('Review and reduce risk exposure')
    }

    // Determine overall risk level
    let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (metrics.riskScore > 80) overallRiskLevel = 'critical'
    else if (metrics.riskScore > 60) overallRiskLevel = 'high'
    else if (metrics.riskScore > 30) overallRiskLevel = 'medium'

    return {
      overallRiskLevel,
      keyMetrics: metrics,
      recommendations,
      alerts
    }
  }

  updateParameters(newParameters: Partial<RiskParameters>): void {
    this.parameters = { ...this.parameters, ...newParameters }
  }

  getParameters(): RiskParameters {
    return { ...this.parameters }
  }
}

// Default risk parameters
const defaultRiskParameters: RiskParameters = {
  maxPositionSize: 10, // 10% of portfolio
  maxPortfolioRisk: 20, // 20% of portfolio
  maxDailyLoss: 5, // 5% of portfolio
  stopLossPercent: 2, // 2% stop loss
  takeProfitPercent: 4, // 4% take profit
  maxCorrelatedPositions: 3, // Maximum 3 correlated positions
  leverage: 2.0, // 2x leverage maximum
  riskPerTrade: 1 // 1% risk per trade
}

export const riskManagementService = new RiskManagementService(defaultRiskParameters)