import { riskManagementService } from './risk-management'

interface ExecutionRequest {
  symbol: string
  type: 'buy' | 'sell'
  quantity: number
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit'
  price?: number
  stopPrice?: number
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok'
  clientId?: string
  strategy?: string
  notes?: string
}

interface ExecutionResult {
  success: boolean
  orderId?: string
  executedPrice?: number
  executedQuantity?: number
  status: 'pending' | 'executed' | 'cancelled' | 'rejected'
  message?: string
  timestamp: string
  fees?: number
}

interface Position {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  unrealizedPnL: number
  realizedPnL: number
  status: 'open' | 'closed'
  openedAt: string
  closedAt?: string
  trades: string[]
}

interface Order {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit'
  quantity: number
  filledQuantity: number
  price?: number
  stopPrice?: number
  status: 'pending' | 'executed' | 'cancelled' | 'rejected'
  createdAt: string
  updatedAt: string
  executedAt?: string
  averagePrice?: number
  fees: number
  strategy?: string
  notes?: string
}

interface MarketData {
  symbol: string
  bid: number
  ask: number
  last: number
  volume: number
  timestamp: string
}

export class TradingExecutionService {
  private orders: Map<string, Order> = new Map()
  private positions: Map<string, Position> = new Map()
  private marketData: Map<string, MarketData> = new Map()
  private executionCallbacks: Map<string, (result: ExecutionResult) => void> = new Map()

  constructor() {
    this.initializeMarketData()
    this.startRealTimeUpdates()
  }

  private initializeMarketData() {
    // Initialize with current market data
    const symbols = ['BTC/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD', 'AAPL', 'TSLA']
    
    symbols.forEach(symbol => {
      this.marketData.set(symbol, {
        symbol,
        bid: this.getBasePrice(symbol) * 0.999,
        ask: this.getBasePrice(symbol) * 1.001,
        last: this.getBasePrice(symbol),
        volume: Math.floor(Math.random() * 1000000) + 100000,
        timestamp: new Date().toISOString()
      })
    })
  }

  private getBasePrice(symbol: string): number {
    const prices: { [key: string]: number } = {
      'BTC/USD': 43256,
      'ETH/USD': 2589,
      'EUR/USD': 1.0856,
      'GBP/USD': 1.2734,
      'AAPL': 182.52,
      'TSLA': 238.45
    }
    return prices[symbol] || 100
  }

  private startRealTimeUpdates() {
    // Simulate real-time market data updates
    setInterval(() => {
      this.marketData.forEach((data, symbol) => {
        const volatility = this.getVolatility(symbol)
        const change = (Math.random() - 0.5) * volatility
        
        const newBid = data.bid * (1 + change)
        const newAsk = data.ask * (1 + change)
        const newLast = (newBid + newAsk) / 2
        
        this.marketData.set(symbol, {
          ...data,
          bid: newBid,
          ask: newAsk,
          last: newLast,
          volume: data.volume + Math.floor(Math.random() * 10000),
          timestamp: new Date().toISOString()
        })

        // Update positions
        this.updatePositionPrices(symbol, newLast)
      })
    }, 1000) // Update every second
  }

  private getVolatility(symbol: string): number {
    const volatilities: { [key: string]: number } = {
      'BTC/USD': 0.002,
      'ETH/USD': 0.003,
      'EUR/USD': 0.0005,
      'GBP/USD': 0.0006,
      'AAPL': 0.001,
      'TSLA': 0.002
    }
    return volatilities[symbol] || 0.001
  }

  async executeOrder(request: ExecutionRequest, portfolio: any): Promise<ExecutionResult> {
    const orderId = this.generateOrderId()
    const timestamp = new Date().toISOString()

    // Validate the order
    const validation = this.validateOrder(request, portfolio)
    if (!validation.valid) {
      return {
        success: false,
        status: 'rejected',
        message: validation.reason,
        timestamp
      }
    }

    // Create order
    const order: Order = {
      id: orderId,
      symbol: request.symbol,
      type: request.type,
      orderType: request.orderType,
      quantity: request.quantity,
      filledQuantity: 0,
      price: request.price,
      stopPrice: request.stopPrice,
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
      fees: 0,
      strategy: request.strategy,
      notes: request.notes
    }

    this.orders.set(orderId, order)

    // Execute the order based on type
    let executionResult: ExecutionResult

    switch (request.orderType) {
      case 'market':
        executionResult = await this.executeMarketOrder(order)
        break
      case 'limit':
        executionResult = await this.executeLimitOrder(order)
        break
      case 'stop':
        executionResult = await this.executeStopOrder(order)
        break
      case 'stop_limit':
        executionResult = await this.executeStopLimitOrder(order)
        break
      default:
        executionResult = {
          success: false,
          status: 'rejected',
          message: 'Invalid order type',
          timestamp
        }
    }

    // Update order status
    order.status = executionResult.status
    order.updatedAt = executionResult.timestamp
    if (executionResult.executedPrice) {
      order.averagePrice = executionResult.executedPrice
      order.filledQuantity = executionResult.executedQuantity || 0
      order.executedAt = executionResult.timestamp
      order.fees = executionResult.fees || 0
    }

    this.orders.set(orderId, order)

    // Update positions if executed
    if (executionResult.success && executionResult.executedQuantity) {
      await this.updatePosition(order, executionResult)
    }

    // Notify callback if exists
    const callback = this.executionCallbacks.get(request.clientId || '')
    if (callback) {
      callback(executionResult)
    }

    return executionResult
  }

  private validateOrder(request: ExecutionRequest, portfolio: any): { valid: boolean; reason?: string } {
    // Check if market data exists
    if (!this.marketData.has(request.symbol)) {
      return { valid: false, reason: 'Market data not available for symbol' }
    }

    // Check quantity
    if (request.quantity <= 0) {
      return { valid: false, reason: 'Quantity must be positive' }
    }

    // For limit orders, check price
    if (request.orderType === 'limit' && !request.price) {
      return { valid: false, reason: 'Limit orders require a price' }
    }

    // For stop orders, check stop price
    if ((request.orderType === 'stop' || request.orderType === 'stop_limit') && !request.stopPrice) {
      return { valid: false, reason: 'Stop orders require a stop price' }
    }

    // Check available funds for buy orders
    if (request.type === 'buy') {
      const marketData = this.marketData.get(request.symbol)!
      const estimatedCost = request.quantity * marketData.ask
      
      if (estimatedCost > portfolio.availableCash) {
        return { valid: false, reason: 'Insufficient funds' }
      }
    }

    // Check position size for sell orders
    if (request.type === 'sell') {
      const position = this.positions.get(request.symbol)
      if (!position || position.quantity < request.quantity) {
        return { valid: false, reason: 'Insufficient position size' }
      }
    }

    return { valid: true }
  }

  private async executeMarketOrder(order: Order): Promise<ExecutionResult> {
    const marketData = this.marketData.get(order.symbol)!
    const timestamp = new Date().toISOString()

    // Simulate market execution with slight slippage
    const slippage = (Math.random() - 0.5) * 0.001 // 0.1% max slippage
    const executedPrice = order.type === 'buy' ? 
      marketData.ask * (1 + slippage) : 
      marketData.bid * (1 - slippage)

    const fees = executedPrice * order.quantity * 0.001 // 0.1% fees

    return {
      success: true,
      orderId: order.id,
      executedPrice,
      executedQuantity: order.quantity,
      status: 'executed',
      timestamp,
      fees
    }
  }

  private async executeLimitOrder(order: Order): Promise<ExecutionResult> {
    const marketData = this.marketData.get(order.symbol)!
    const timestamp = new Date().toISOString()

    // Check if limit price is met
    const canExecute = order.type === 'buy' ? 
      marketData.ask <= (order.price || 0) : 
      marketData.bid >= (order.price || 0)

    if (canExecute) {
      const executedPrice = order.price || marketData.last
      const fees = executedPrice * order.quantity * 0.001

      return {
        success: true,
        orderId: order.id,
        executedPrice,
        executedQuantity: order.quantity,
        status: 'executed',
        timestamp,
        fees
      }
    }

    return {
      success: false,
      orderId: order.id,
      status: 'pending',
      message: 'Limit price not met',
      timestamp
    }
  }

  private async executeStopOrder(order: Order): Promise<ExecutionResult> {
    const marketData = this.marketData.get(order.symbol)!
    const timestamp = new Date().toISOString()

    // Check if stop price is triggered
    const stopTriggered = order.type === 'buy' ? 
      marketData.last >= (order.stopPrice || 0) : 
      marketData.last <= (order.stopPrice || 0)

    if (stopTriggered) {
      // Convert to market order
      const slippage = (Math.random() - 0.5) * 0.001
      const executedPrice = order.type === 'buy' ? 
        marketData.ask * (1 + slippage) : 
        marketData.bid * (1 - slippage)

      const fees = executedPrice * order.quantity * 0.001

      return {
        success: true,
        orderId: order.id,
        executedPrice,
        executedQuantity: order.quantity,
        status: 'executed',
        timestamp,
        fees
      }
    }

    return {
      success: false,
      orderId: order.id,
      status: 'pending',
      message: 'Stop price not triggered',
      timestamp
    }
  }

  private async executeStopLimitOrder(order: Order): Promise<ExecutionResult> {
    const marketData = this.marketData.get(order.symbol)!
    const timestamp = new Date().toISOString()

    // Check if stop price is triggered
    const stopTriggered = order.type === 'buy' ? 
      marketData.last >= (order.stopPrice || 0) : 
      marketData.last <= (order.stopPrice || 0)

    if (stopTriggered) {
      // Convert to limit order
      const canExecute = order.type === 'buy' ? 
        marketData.ask <= (order.price || 0) : 
        marketData.bid >= (order.price || 0)

      if (canExecute) {
        const executedPrice = order.price || marketData.last
        const fees = executedPrice * order.quantity * 0.001

        return {
          success: true,
          orderId: order.id,
          executedPrice,
          executedQuantity: order.quantity,
          status: 'executed',
          timestamp,
          fees
        }
      }

      return {
        success: false,
        orderId: order.id,
        status: 'pending',
        message: 'Stop triggered but limit price not met',
        timestamp
      }
    }

    return {
      success: false,
      orderId: order.id,
      status: 'pending',
      message: 'Stop price not triggered',
      timestamp
    }
  }

  private async updatePosition(order: Order, executionResult: ExecutionResult): Promise<void> {
    const symbol = order.symbol
    const existingPosition = this.positions.get(symbol)
    const executedPrice = executionResult.executedPrice!
    const executedQuantity = executionResult.executedQuantity!

    if (order.type === 'buy') {
      if (existingPosition) {
        // Add to existing position
        const totalQuantity = existingPosition.quantity + executedQuantity
        const totalCost = (existingPosition.averagePrice * existingPosition.quantity) + (executedPrice * executedQuantity)
        const newAveragePrice = totalCost / totalQuantity

        existingPosition.quantity = totalQuantity
        existingPosition.averagePrice = newAveragePrice
        existingPosition.trades.push(order.id)
      } else {
        // Create new position
        const newPosition: Position = {
          symbol,
          quantity: executedQuantity,
          averagePrice: executedPrice,
          currentPrice: executedPrice,
          unrealizedPnL: 0,
          realizedPnL: 0,
          status: 'open',
          openedAt: executionResult.timestamp,
          trades: [order.id]
        }

        this.positions.set(symbol, newPosition)
      }
    } else {
      // Sell order
      if (existingPosition) {
        const realizedPnL = (executedPrice - existingPosition.averagePrice) * executedQuantity
        existingPosition.realizedPnL += realizedPnL
        existingPosition.quantity -= executedQuantity
        existingPosition.trades.push(order.id)

        if (existingPosition.quantity <= 0) {
          // Close position
          existingPosition.status = 'closed'
          existingPosition.closedAt = executionResult.timestamp
        }
      }
    }
  }

  private updatePositionPrices(symbol: string, currentPrice: number): void {
    const position = this.positions.get(symbol)
    if (position && position.status === 'open') {
      position.currentPrice = currentPrice
      position.unrealizedPnL = (currentPrice - position.averagePrice) * position.quantity
    }
  }

  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Public methods
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId)
  }

  getOrders(): Order[] {
    return Array.from(this.orders.values())
  }

  getPendingOrders(): Order[] {
    return Array.from(this.orders.values()).filter(order => order.status === 'pending')
  }

  getPosition(symbol: string): Position | undefined {
    return this.positions.get(symbol)
  }

  getPositions(): Position[] {
    return Array.from(this.positions.values())
  }

  getOpenPositions(): Position[] {
    return Array.from(this.positions.values()).filter(position => position.status === 'open')
  }

  getMarketData(symbol: string): MarketData | undefined {
    return this.marketData.get(symbol)
  }

  getAllMarketData(): MarketData[] {
    return Array.from(this.marketData.values())
  }

  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId)
    if (order && order.status === 'pending') {
      order.status = 'cancelled'
      order.updatedAt = new Date().toISOString()
      this.orders.set(orderId, order)
      return true
    }
    return false
  }

  setExecutionCallback(clientId: string, callback: (result: ExecutionResult) => void): void {
    this.executionCallbacks.set(clientId, callback)
  }

  removeExecutionCallback(clientId: string): void {
    this.executionCallbacks.delete(clientId)
  }

  getPortfolioSummary(): {
    totalValue: number
    totalUnrealizedPnL: number
    totalRealizedPnL: number
    openPositions: number
    pendingOrders: number
  } {
    const positions = this.getOpenPositions()
    const pendingOrders = this.getPendingOrders()

    const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
    const totalRealizedPnL = Array.from(this.positions.values())
      .reduce((sum, pos) => sum + pos.realizedPnL, 0)

    // Estimate total value (would need actual portfolio data)
    const totalValue = 1250000 + totalUnrealizedPnL + totalRealizedPnL

    return {
      totalValue,
      totalUnrealizedPnL,
      totalRealizedPnL,
      openPositions: positions.length,
      pendingOrders: pendingOrders.length
    }
  }
}

export const tradingExecutionService = new TradingExecutionService()