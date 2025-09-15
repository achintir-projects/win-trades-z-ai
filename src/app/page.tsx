'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  BarChart3, 
  Settings, 
  Play, 
  Pause, 
  Brain, 
  Target, 
  Zap, 
  Shield, 
  AlertTriangle, 
  Clock,
  Sparkles,
  CandlestickChart,
  LineChart,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Bot,
  Globe,
  Coins,
  TrendingUpIcon,
  Wallet,
  Percent,
  Timer,
  RefreshCw
} from 'lucide-react'

interface MarketData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  type: 'forex' | 'crypto' | 'commodity' | 'stock'
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

interface Portfolio {
  totalValue: number
  dailyChange: number
  dailyChangePercent: number
  totalReturn: number
  totalReturnPercent: number
  winRate: number
  activeTrades: number
}

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

export default function TradingDashboard() {
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [portfolio, setPortfolio] = useState<Portfolio>({
    totalValue: 0,
    dailyChange: 0,
    dailyChangePercent: 0,
    totalReturn: 0,
    totalReturnPercent: 0,
    winRate: 0,
    activeTrades: 0
  })
  const [strategySignals, setStrategySignals] = useState<StrategySignal[]>([])
  const [isAutoTrading, setIsAutoTrading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [analyzingSymbol, setAnalyzingSymbol] = useState<string | null>(null)
  const [riskParameters, setRiskParameters] = useState<any>(null)
  const [portfolioMetrics, setPortfolioMetrics] = useState<any>(null)
  const [backtestConfig, setBacktestConfig] = useState({
    symbol: '',
    strategy: '',
    startDate: '',
    endDate: '',
    initialCapital: 100000
  })
  const [backtestResults, setBacktestResults] = useState<any>(null)
  const [isBacktesting, setIsBacktesting] = useState(false)
  const [optimizationResults, setOptimizationResults] = useState<any>(null)

  useEffect(() => {
    fetchMarketData()
    fetchTrades()
    fetchPortfolio()
    fetchRiskParameters()
    fetchPortfolioMetrics()
    
    const interval = setInterval(() => {
      fetchMarketData()
      fetchTrades()
      fetchPortfolio()
      fetchPortfolioMetrics()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/markets')
      const data = await response.json()
      setMarketData(data)
    } catch (error) {
      console.error('Error fetching market data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTrades = async () => {
    try {
      const response = await fetch('/api/trades')
      const data = await response.json()
      setTrades(data)
    } catch (error) {
      console.error('Error fetching trades:', error)
    }
  }

  const fetchPortfolio = async () => {
    try {
      const response = await fetch('/api/portfolio')
      const data = await response.json()
      setPortfolio(data)
    } catch (error) {
      console.error('Error fetching portfolio:', error)
    }
  }

  const fetchRiskParameters = async () => {
    try {
      const response = await fetch('/api/risk')
      const data = await response.json()
      setRiskParameters(data.parameters)
    } catch (error) {
      console.error('Error fetching risk parameters:', error)
    }
  }

  const fetchPortfolioMetrics = async () => {
    try {
      const portfolioData = {
        totalValue: portfolio.totalValue || 1250000,
        availableCash: 250000,
        dailyPnL: 15420,
        positions: trades.filter(t => t.status === 'open').map(t => ({
          symbol: t.symbol,
          quantity: t.quantity,
          entryPrice: t.entryPrice,
          currentPrice: t.currentPrice,
          unrealizedPnL: t.profitLoss,
          type: t.type === 'buy' ? 'long' : 'short' as const
        }))
      }

      const response = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'portfolio-metrics',
          ...portfolioData
        })
      })

      const data = await response.json()
      setPortfolioMetrics(data.metrics)
    } catch (error) {
      console.error('Error fetching portfolio metrics:', error)
    }
  }

  const toggleAutoTrading = () => {
    setIsAutoTrading(!isAutoTrading)
  }

  const analyzeStrategies = async (symbol: string) => {
    setAnalyzingSymbol(symbol)
    try {
      const market = marketData.find(m => m.symbol === symbol)
      if (!market) return

      const historicalData = generateHistoricalData(market)
      
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          action: 'analyze',
          marketData: historicalData
        })
      })

      const data = await response.json()
      if (data.consensus) {
        setStrategySignals(prev => [data.consensus, ...prev.filter(s => s.symbol !== symbol)])
      }
    } catch (error) {
      console.error('Error analyzing strategies:', error)
    } finally {
      setAnalyzingSymbol(null)
    }
  }

  const executeTrade = async (signal: StrategySignal) => {
    try {
      const portfolioData = {
        totalValue: portfolio.totalValue,
        availableCash: portfolio.totalValue * 0.2,
        dailyPnL: portfolio.dailyChange,
        positions: trades.filter(t => t.status === 'open').map(t => ({
          symbol: t.symbol,
          quantity: t.quantity,
          entryPrice: t.entryPrice,
          currentPrice: t.currentPrice,
          unrealizedPnL: t.profitLoss,
          type: t.type === 'buy' ? 'long' : 'short' as const
        }))
      }

      const riskResponse = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assess',
          symbol: signal.symbol,
          action: signal.action === 'buy' ? 'buy' : 'sell',
          quantity: 1000,
          entryPrice: signal.entryPrice,
          stopLoss: signal.stopLoss,
          portfolio: portfolioData
        })
      })

      const riskAssessment = await riskResponse.json()

      if (!riskAssessment.assessment.canExecute) {
        alert(`Trade cannot be executed due to risk constraints: ${riskAssessment.assessment.reason}`)
        return
      }

      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: signal.symbol,
          type: signal.action === 'buy' ? 'buy' : 'sell',
          quantity: riskAssessment.assessment.suggestedQuantity || 1000,
          entryPrice: signal.entryPrice,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          notes: signal.reason
        })
      })

      if (response.ok) {
        fetchTrades()
        fetchPortfolioMetrics()
        setStrategySignals(prev => prev.filter(s => s.symbol !== signal.symbol))
      }
    } catch (error) {
      console.error('Error executing trade:', error)
    }
  }

  const runBacktest = async () => {
    if (!backtestConfig.symbol || !backtestConfig.strategy || !backtestConfig.startDate || !backtestConfig.endDate) {
      alert('Please fill in all backtest configuration fields')
      return
    }

    setIsBacktesting(true)
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run',
          symbol: backtestConfig.symbol,
          strategy: backtestConfig.strategy,
          startDate: backtestConfig.startDate,
          endDate: backtestConfig.endDate,
          initialCapital: backtestConfig.initialCapital
        })
      })

      const data = await response.json()
      setBacktestResults(data.result)
    } catch (error) {
      console.error('Error running backtest:', error)
      alert('Error running backtest. Please try again.')
    } finally {
      setIsBacktesting(false)
    }
  }

  const optimizeParameters = async () => {
    if (!backtestConfig.symbol || !backtestConfig.strategy || !backtestConfig.startDate || !backtestConfig.endDate) {
      alert('Please fill in all backtest configuration fields first')
      return
    }

    setIsBacktesting(true)
    try {
      const parameterRanges = {
        rsiPeriod: [10, 14, 20],
        macdFast: [8, 12, 16],
        macdSlow: [20, 26, 30],
        stopLossPercent: [1.5, 2.0, 2.5, 3.0],
        takeProfitPercent: [3.0, 4.0, 5.0, 6.0]
      }

      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize',
          symbol: backtestConfig.symbol,
          strategy: backtestConfig.strategy,
          startDate: backtestConfig.startDate,
          endDate: backtestConfig.endDate,
          initialCapital: backtestConfig.initialCapital,
          parameterRanges
        })
      })

      const data = await response.json()
      setOptimizationResults(data.results)
    } catch (error) {
      console.error('Error optimizing parameters:', error)
      alert('Error optimizing parameters. Please try again.')
    } finally {
      setIsBacktesting(false)
    }
  }

  const configureStrategy = (strategyName: string) => {
    alert(`Configuration panel for ${strategyName} strategy would open here. This would allow you to adjust strategy parameters, indicators, and risk settings.`)
  }

  const getMarketColor = (type: string) => {
    switch (type) {
      case 'forex': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'crypto': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'commodity': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'stock': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'bullish': return 'text-green-600 bg-green-50'
      case 'bearish': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'buy': return 'bg-green-100 text-green-800 border-green-200'
      case 'sell': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMarketIcon = (type: string) => {
    switch (type) {
      case 'forex': return <Globe className="h-4 w-4" />
      case 'crypto': return <Coins className="h-4 w-4" />
      case 'commodity': return <BarChart3 className="h-4 w-4" />
      case 'stock': return <TrendingUpIcon className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  // Helper function to generate historical data
  const generateHistoricalData = (market: MarketData, periods: number = 50) => {
    const data = []
    let currentPrice = market.price - (market.change * 10)
    
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-purple-300 text-lg">Loading AI Trading System...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-800 to-blue-800 bg-clip-text text-transparent">
                  Quantum AI Trading
                </h1>
                <p className="text-sm text-gray-600">Advanced algorithmic trading with AI-powered insights</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isAutoTrading ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={`text-sm font-medium ${isAutoTrading ? 'text-green-600' : 'text-gray-600'}`}>
                  {isAutoTrading ? 'Auto Trading Active' : 'Auto Trading Paused'}
                </span>
              </div>
              <Button
                onClick={toggleAutoTrading}
                variant={isAutoTrading ? "destructive" : "default"}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isAutoTrading ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isAutoTrading ? "Stop Trading" : "Start Trading"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Portfolio Value</CardTitle>
              <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                <Wallet className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-800 to-blue-800 bg-clip-text text-transparent">
                ${portfolio.totalValue.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {portfolio.dailyChange >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm ${portfolio.dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolio.dailyChange >= 0 ? '+' : ''}{portfolio.dailyChangePercent.toFixed(2)}% today
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-green-100 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Return</CardTitle>
              <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                +{portfolio.totalReturnPercent.toFixed(2)}%
              </div>
              <p className="text-sm text-gray-600 mt-2">
                ${portfolio.totalReturn.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Win Rate</CardTitle>
              <div className="p-2 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg">
                <Percent className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {portfolio.winRate.toFixed(1)}%
              </div>
              <Progress value={portfolio.winRate} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-orange-100 hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Active Trades</CardTitle>
              <div className="p-2 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg">
                <Activity className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {portfolio.activeTrades}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Currently open positions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="markets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 bg-white/80 backdrop-blur-sm border-purple-100 p-1 rounded-lg">
            <TabsTrigger value="markets" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
              <Globe className="h-4 w-4 mr-2" />
              Markets
            </TabsTrigger>
            <TabsTrigger value="signals" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
              <Brain className="h-4 w-4 mr-2" />
              Signals
            </TabsTrigger>
            <TabsTrigger value="trades" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
              <CandlestickChart className="h-4 w-4 mr-2" />
              Trades
            </TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
              <Shield className="h-4 w-4 mr-2" />
              Risk
            </TabsTrigger>
            <TabsTrigger value="backtest" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
              <LineChart className="h-4 w-4 mr-2" />
              Backtest
            </TabsTrigger>
            <TabsTrigger value="strategies" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
              <Bot className="h-4 w-4 mr-2" />
              Strategies
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
              <PieChart className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="markets" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-800">Market Overview</CardTitle>
                    <CardDescription className="text-gray-600">
                      Real-time market data across forex, crypto, commodities, and stocks
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {marketData.map((market) => (
                    <div key={market.symbol} className="flex items-center justify-between p-6 bg-gradient-to-r from-white to-purple-50 border border-purple-100 rounded-xl hover:shadow-md transition-all duration-300">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg ${getMarketColor(market.type)}`}>
                            {getMarketIcon(market.type)}
                          </div>
                          <div>
                            <div className="font-bold text-lg text-gray-900">{market.symbol}</div>
                            <div className="text-sm text-gray-600">{market.name}</div>
                            {market.analysis && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className={`text-xs ${getTrendColor(market.analysis.trend)}`}>
                                  {market.analysis.trend.toUpperCase()}
                                </Badge>
                                <Badge className={`text-xs ${getRecommendationColor(market.analysis.recommendation)}`}>
                                  {market.analysis.recommendation.toUpperCase()}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          ${market.price.toLocaleString()}
                        </div>
                        <div className={`flex items-center justify-end gap-1 ${market.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {market.change >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          <span className="font-medium">
                            {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)} ({market.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                        {market.sentiment && (
                          <div className={`text-xs mt-1 ${getSentimentColor(market.sentiment.sentiment)}`}>
                            Sentiment: {market.sentiment.sentiment} ({market.sentiment.score})
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          Vol: {(market.volume / 1000000).toFixed(1)}M
                        </div>
                        {market.analysis && (
                          <div className="text-xs text-gray-500 mt-1">
                            Confidence: {market.analysis.confidence}%
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => analyzeStrategies(market.symbol)}
                          disabled={analyzingSymbol === market.symbol}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          {analyzingSymbol === market.symbol ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Brain className="h-4 w-4" />
                          )}
                          Analyze
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signals" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-800">AI Trading Signals</CardTitle>
                <CardDescription className="text-gray-600">
                  Real-time trading signals generated by our AI algorithms
                </CardDescription>
              </CardHeader>
              <CardContent>
                {strategySignals.length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active signals. Analyze markets to generate signals.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {strategySignals.map((signal) => (
                      <div key={signal.symbol} className="flex items-center justify-between p-6 bg-gradient-to-r from-white to-blue-50 border border-blue-100 rounded-xl">
                        <div className="flex items-center gap-6">
                          <div className={`p-3 rounded-lg ${
                            signal.action === 'buy' ? 'bg-green-100 text-green-800' : 
                            signal.action === 'sell' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {signal.action === 'buy' ? <ArrowUpRight className="h-5 w-5" /> : 
                             signal.action === 'sell' ? <ArrowDownRight className="h-5 w-5" /> : 
                             <Minus className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-lg text-gray-900">{signal.symbol}</div>
                            <div className="text-sm text-gray-600">{signal.reason}</div>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="text-sm">
                                <span className="text-gray-600">Strength:</span>
                                <span className="font-medium ml-1">{signal.strength}%</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Confidence:</span>
                                <span className="font-medium ml-1">{signal.confidence}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            ${signal.entryPrice.toLocaleString()}
                          </div>
                          {signal.stopLoss && (
                            <div className="text-sm text-red-600">
                              SL: ${signal.stopLoss.toLocaleString()}
                            </div>
                          )}
                          {signal.takeProfit && (
                            <div className="text-sm text-green-600">
                              TP: ${signal.takeProfit.toLocaleString()}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm"
                            onClick={() => executeTrade(signal)}
                            className={`${
                              signal.action === 'buy' ? 'bg-green-600 hover:bg-green-700' : 
                              signal.action === 'sell' ? 'bg-red-600 hover:bg-red-700' : 
                              'bg-gray-600 hover:bg-gray-700'
                            }`}
                          >
                            Execute {signal.action.toUpperCase()}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-800">Active Trades</CardTitle>
                <CardDescription className="text-gray-600">
                  Currently open positions and their performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trades.length === 0 ? (
                  <div className="text-center py-12">
                    <CandlestickChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active trades. Start trading to see positions here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-6 bg-gradient-to-r from-white to-green-50 border border-green-100 rounded-xl">
                        <div className="flex items-center gap-6">
                          <div className={`p-3 rounded-lg ${
                            trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {trade.type === 'buy' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-lg text-gray-900">{trade.symbol}</div>
                            <div className="text-sm text-gray-600">
                              {trade.quantity} @ ${trade.entryPrice.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Opened: {new Date(trade.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            ${trade.currentPrice.toLocaleString()}
                          </div>
                          <div className={`flex items-center justify-end gap-1 ${trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trade.profitLoss >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            <span className="font-medium">
                              {trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(2)} ({trade.profitLossPercent.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant={trade.status === 'open' ? 'default' : 'secondary'}>
                            {trade.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-800">Risk Management</CardTitle>
                <CardDescription className="text-gray-600">
                  Monitor portfolio risk and manage trading parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                {portfolioMetrics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 bg-gradient-to-r from-white to-red-50 border border-red-100 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <h3 className="font-bold text-gray-900">Risk Score</h3>
                      </div>
                      <div className="text-3xl font-bold text-red-600 mb-2">
                        {portfolioMetrics.riskScore}/100
                      </div>
                      <Progress value={portfolioMetrics.riskScore} className="h-2" />
                    </div>
                    
                    <div className="p-6 bg-gradient-to-r from-white to-blue-50 border border-blue-100 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="font-bold text-gray-900">Leverage</h3>
                      </div>
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {portfolioMetrics.leverage?.toFixed(2) || '0.00'}x
                      </div>
                      <p className="text-sm text-gray-600">
                        {portfolioMetrics.leverage > 1.5 ? 'High leverage detected' : 'Leverage within limits'}
                      </p>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-r from-white to-green-50 border border-green-100 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Percent className="h-5 w-5 text-green-600" />
                        </div>
                        <h3 className="font-bold text-gray-900">Cash Ratio</h3>
                      </div>
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {portfolioMetrics.cashRatio?.toFixed(1) || '0'}%
                      </div>
                      <Progress value={portfolioMetrics.cashRatio} className="h-2" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Loading risk metrics...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backtest" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-800">Strategy Backtesting</CardTitle>
                <CardDescription className="text-gray-600">
                  Test trading strategies with historical data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="symbol">Symbol</Label>
                    <Select onValueChange={(value) => setBacktestConfig(prev => ({ ...prev, symbol: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select symbol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC/USD">BTC/USD</SelectItem>
                        <SelectItem value="ETH/USD">ETH/USD</SelectItem>
                        <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                        <SelectItem value="AAPL">AAPL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="strategy">Strategy</Label>
                    <Select onValueChange={(value) => setBacktestConfig(prev => ({ ...prev, strategy: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical Analysis</SelectItem>
                        <SelectItem value="ml">Machine Learning</SelectItem>
                        <SelectItem value="hybrid">Hybrid Strategy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input 
                      type="date" 
                      id="startDate"
                      onChange={(e) => setBacktestConfig(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input 
                      type="date" 
                      id="endDate"
                      onChange={(e) => setBacktestConfig(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <Button 
                    onClick={runBacktest}
                    disabled={isBacktesting}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isBacktesting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <LineChart className="h-4 w-4 mr-2" />}
                    {isBacktesting ? 'Running Backtest...' : 'Run Backtest'}
                  </Button>
                  
                  <Button 
                    onClick={optimizeParameters}
                    disabled={isBacktesting}
                    variant="outline"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Optimize Parameters
                  </Button>
                </div>
                
                {backtestResults && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-white to-purple-50 border border-purple-100 rounded-xl">
                    <h3 className="font-bold text-lg text-gray-900 mb-4">Backtest Results</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Total Return</div>
                        <div className={`text-xl font-bold ${backtestResults.summary.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {backtestResults.summary.totalReturnPercent.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Win Rate</div>
                        <div className="text-xl font-bold text-blue-600">
                          {backtestResults.summary.winRate.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Max Drawdown</div>
                        <div className="text-xl font-bold text-red-600">
                          {backtestResults.summary.maxDrawdown.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Sharpe Ratio</div>
                        <div className="text-xl font-bold text-purple-600">
                          {backtestResults.summary.sharpeRatio.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategies" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-800">Trading Strategies</CardTitle>
                <CardDescription className="text-gray-600">
                  Manage and configure your trading strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-6 bg-gradient-to-r from-white to-blue-50 border border-blue-100 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <LineChart className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">Technical Analysis</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Uses technical indicators like RSI, MACD, and moving averages for trading signals.
                    </p>
                    <Button 
                      size="sm" 
                      onClick={() => configureStrategy('Technical Analysis')}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Configure
                    </Button>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-r from-white to-purple-50 border border-purple-100 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Brain className="h-6 w-6 text-purple-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">Machine Learning</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      AI-powered strategy that learns from market patterns and adapts to changing conditions.
                    </p>
                    <Button 
                      size="sm" 
                      onClick={() => configureStrategy('Machine Learning')}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Configure
                    </Button>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-r from-white to-green-50 border border-green-100 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Sparkles className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">Hybrid Strategy</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Combines technical analysis with machine learning for optimal performance.
                    </p>
                    <Button 
                      size="sm" 
                      onClick={() => configureStrategy('Hybrid Strategy')}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Configure
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-800">Performance Analytics</CardTitle>
                <CardDescription className="text-gray-600">
                  Detailed performance metrics and analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Performance analytics will be available after executing trades.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}