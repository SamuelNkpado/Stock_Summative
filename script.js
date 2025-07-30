// Configuration - Your Alpha Vantage API key
const ALPHA_VANTAGE_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"

// Global variables
let currentStockData = null

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
    // Add enter key support for search
    document.getElementById("stockSymbol").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            searchStock()
        }
    })
})


// Main search function
async function searchStock() {
    const symbol = document.getElementById("stockSymbol").value.trim().toUpperCase()

    if (!symbol) {
        showError("Please enter a stock symbol")
        return
    }

    setLoadingState(true)
    hideError()
    hideStockData()

    try {
        // Fetch both stock data and cash flow data
        const [stockData, cashFlowData] = await Promise.all([fetchStockData(symbol), fetchCashFlowData(symbol)])

        if (stockData.error) {
            showError(stockData.error)
            return
        }

        currentStockData = stockData.data
        displayStockData(currentStockData)

        // Only show cash flow if we have REAL data from Alpha Vantage
        if (cashFlowData.data && !cashFlowData.error && Array.isArray(cashFlowData.data) && cashFlowData.data.length > 0) {
            displayCashFlowData(cashFlowData.data)
            document.getElementById("cashFlowSection").style.display = "block"
        } else {
            // Hide cash flow section if no real data available
            document.getElementById("cashFlowSection").style.display = "none"
            console.log("Cash flow section hidden - no real financial data available")
        }

        showStockData()
    } catch (error) {
        console.error("Search error:", error)
        showError("An unexpected error occurred. Please try again.")
    } finally {
        setLoadingState(false)
    }
}

// Fetch stock data from Alpha Vantage API
async function fetchStockData(symbol) {
    try {
        // Get real-time quote data
        const quoteUrl = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`

        const response = await fetch(quoteUrl)

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        console.log("Alpha Vantage quote data:", data)

        // Check for API errors
        if (data["Error Message"]) {
            throw new Error("Stock symbol not found. Please check the symbol and try again.")
        }

        if (data["Note"]) {
            throw new Error("API rate limit reached. Please try again in a minute.")
        }

        if (!data["Global Quote"]) {
            throw new Error("No data available for this symbol")
        }

        return { data: processAlphaVantageQuote(data["Global Quote"], symbol) }
    } catch (error) {
        console.error("Alpha Vantage API Error:", error)
        return { error: error.message || "Failed to fetch stock data" }
    }
}

// Fetch cash flow data from Alpha Vantage API
async function fetchCashFlowData(symbol) {
    try {
        // Get cash flow statement
        const cashFlowUrl = `${ALPHA_VANTAGE_BASE_URL}?function=CASH_FLOW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`

        console.log("Fetching cash flow from:", cashFlowUrl)

        const response = await fetch(cashFlowUrl)

        if (!response.ok) {
            console.log("Cash flow API response not OK:", response.status)
            return { error: "Failed to fetch cash flow data" }
        }

        const data = await response.json()
        console.log("Raw Alpha Vantage cash flow response:", data)

        // Check for API errors
        if (data["Error Message"]) {
            console.log("Alpha Vantage error:", data["Error Message"])
            return { error: "Cash flow data not available for this symbol" }
        }

        if (data["Note"]) {
            console.log("Alpha Vantage rate limit:", data["Note"])
            return { error: "API rate limit reached - please wait a minute" }
        }

        if (data.quarterlyReports && data.quarterlyReports.length > 0) {
            console.log("Processing quarterly reports:", data.quarterlyReports)
            return { data: processAlphaVantageCashFlow(data.quarterlyReports) }
        }

        console.log("No quarterly reports found in response")
        return { error: "No cash flow data available" }
    } catch (error) {
        console.error("Cash Flow API Error:", error)
        return { error: "Cash flow data not available" }
    }
}

// Process Alpha Vantage quote data
function processAlphaVantageQuote(quote, symbol) {
    const price = Number.parseFloat(quote["05. price"]) || 0
    const change = Number.parseFloat(quote["09. change"]) || 0
    const changePercent = Number.parseFloat(quote["10. change percent"].replace("%", "")) || 0
    const volume = Number.parseInt(quote["06. volume"]) || 0
    const high = Number.parseFloat(quote["03. high"]) || 0
    const low = Number.parseFloat(quote["04. low"]) || 0
    const previousClose = Number.parseFloat(quote["08. previous close"]) || 0

    // Get company name (simplified mapping for common stocks)
    const companyNames = {
        AAPL: "Apple Inc.",
        GOOGL: "Alphabet Inc.",
        MSFT: "Microsoft Corporation",
        TSLA: "Tesla, Inc.",
        AMZN: "Amazon.com, Inc.",
        META: "Meta Platforms, Inc.",
        NVDA: "NVIDIA Corporation",
        NFLX: "Netflix, Inc.",
        IBM: "International Business Machines Corporation",
        ORCL: "Oracle Corporation",
        CRM: "Salesforce, Inc.",
        ADBE: "Adobe Inc.",
    }

    return {
        symbol: symbol,
        name: companyNames[symbol] || `${symbol} Corporation`,
        price: price,
        change: change,
        changePercent: changePercent,
        volume: volume,
        marketCap: estimateMarketCap(price, symbol), // Estimated since not in quote
        peRatio: null, // Not available in quote, would need separate call
        high52Week: high, // Using daily high as placeholder
        low52Week: low, // Using daily low as placeholder
        previousClose: previousClose,
        dailyHigh: high,
        dailyLow: low,
    }
}

// Process Alpha Vantage cash flow data
function processAlphaVantageCashFlow(quarterlyReports) {
    console.log("Processing cash flow reports:", quarterlyReports)

    return quarterlyReports.slice(0, 4).map((report) => {
        console.log("Processing report:", report)

        const fiscalDate = new Date(report.fiscalDateEnding)
        const year = fiscalDate.getFullYear()
        const month = fiscalDate.getMonth() + 1
        const quarter = Math.ceil(month / 3)

        console.log(`Fiscal date: ${report.fiscalDateEnding}, Year: ${year}, Quarter: Q${quarter}`)

        return {
            period: `Q${quarter} ${year}`,
            operatingCashFlow: Number.parseInt(report.operatingCashflow) || 0,
            investingCashFlow: Number.parseInt(report.cashflowFromInvestment) || 0,
            financingCashFlow: Number.parseInt(report.cashflowFromFinancing) || 0,
            freeCashFlow:
                (Number.parseInt(report.operatingCashflow) || 0) - (Number.parseInt(report.capitalExpenditures) || 0),
            fiscalDateEnding: report.fiscalDateEnding,
        }
    })
}

// Estimate market cap (rough calculation)
function estimateMarketCap(price, symbol) {
    // Rough share count estimates for major companies (in millions)
    const shareEstimates = {
        AAPL: 15500,
        GOOGL: 12800,
        MSFT: 7400,
        TSLA: 3200,
        AMZN: 10700,
        META: 2700,
        NVDA: 2500,
        NFLX: 440,
        IBM: 920,
        ORCL: 2700,
    }

    const shares = shareEstimates[symbol] || 1000 // Default estimate
    return price * shares * 1000000 // Convert to actual market cap
}

// Display stock data in the UI
function displayStockData(data) {
    // Update main stock info
    document.getElementById("stockSymbolDisplay").textContent = data.symbol
    document.getElementById("stockNameDisplay").textContent = data.name

    // Update badge
    const badge = document.getElementById("stockBadge")
    const trendIcon = document.getElementById("trendIcon")
    const changePercentEl = document.getElementById("changePercent")

    if (data.change >= 0) {
        badge.className = "badge positive"
        trendIcon.className = "fas fa-arrow-trend-up"
    } else {
        badge.className = "badge negative"
        trendIcon.className = "fas fa-arrow-trend-down"
    }

    changePercentEl.textContent = `${data.changePercent.toFixed(2)}%`

    // Update metrics
    document.getElementById("currentPrice").textContent = formatCurrency(data.price)

    const priceChangeEl = document.getElementById("priceChange")
    priceChangeEl.textContent = `${data.change >= 0 ? "+" : ""}${formatCurrency(data.change)}`
    priceChangeEl.style.color = data.change >= 0 ? "#059669" : "#dc2626"

    document.getElementById("volume").textContent = formatNumber(data.volume)
    document.getElementById("marketCap").textContent = formatLargeNumber(data.marketCap)
    document.getElementById("peRatio").textContent = data.peRatio ? data.peRatio.toFixed(2) : "N/A"
    document.getElementById("high52Week").textContent = formatCurrency(data.dailyHigh)
    document.getElementById("low52Week").textContent = formatCurrency(data.dailyLow)
}

// Display cash flow data
function displayCashFlowData(cashFlowData) {
    const tableBody = document.getElementById("cashFlowTableBody")
    tableBody.innerHTML = ""

    cashFlowData.forEach((data) => {
        const row = document.createElement("tr")
        row.innerHTML = `
            <td style="font-weight: 600;">${data.period}</td>
            <td>${formatLargeNumber(data.operatingCashFlow)}</td>
            <td>${formatLargeNumber(data.investingCashFlow)}</td>
            <td>${formatLargeNumber(data.financingCashFlow)}</td>
            <td style="font-weight: 600;">${formatLargeNumber(data.freeCashFlow)}</td>
        `
        tableBody.appendChild(row)
    })

    document.getElementById("cashFlowSection").style.display = "block"
}

// Search popular stock
function searchPopularStock(symbol) {
    document.getElementById("stockSymbol").value = symbol
    searchStock()
}

// Utility functions
function formatCurrency(value) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}

function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(value)
}

function formatLargeNumber(value) {
    const absValue = Math.abs(value)
    const sign = value < 0 ? "-" : ""

    if (absValue >= 1e12) return `${sign}$${(absValue / 1e12).toFixed(2)}T`
    if (absValue >= 1e9) return `${sign}$${(absValue / 1e9).toFixed(2)}B`
    if (absValue >= 1e6) return `${sign}$${(absValue / 1e6).toFixed(2)}M`
    if (absValue >= 1e3) return `${sign}$${(absValue / 1e3).toFixed(2)}K`
    return formatCurrency(value)
}

// UI state management
function setLoadingState(isLoading) {
    const searchBtn = document.getElementById("searchBtn")
    const searchBtnText = document.getElementById("searchBtnText")
    const searchSpinner = document.getElementById("searchSpinner")
    const loadingState = document.getElementById("loadingState")

    if (isLoading) {
        searchBtn.disabled = true
        searchBtnText.style.display = "none"
        searchSpinner.style.display = "inline-block"
        loadingState.style.display = "grid"
    } else {
        searchBtn.disabled = false
        searchBtnText.style.display = "inline-block"
        searchSpinner.style.display = "none"
        loadingState.style.display = "none"
    }
}

function showError(message) {
    const errorAlert = document.getElementById("errorAlert")
    const errorMessage = document.getElementById("errorMessage")
    errorMessage.textContent = message
    errorAlert.style.display = "flex"
}

function hideError() {
    document.getElementById("errorAlert").style.display = "none"
}

function showStockData() {
    document.getElementById("stockDataSection").style.display = "block"
}

function hideStockData() {
    document.getElementById("stockDataSection").style.display = "none"
    document.getElementById("cashFlowSection").style.display = "none"
}

// Making it accessible in the HTML
window.searchStock = searchStock;
window.searchPopularStock = searchPopularStock;