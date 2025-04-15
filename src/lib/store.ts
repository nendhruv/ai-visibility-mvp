import { CompanyData, Competitor, TrackingResults } from '@/types'

class Store {
  private static instance: Store
  private companyData: CompanyData | null = null
  private competitors: Competitor[] | null = null
  private trackingResults: TrackingResults | null = null

  private constructor() {
    // Load data from localStorage on initialization
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem('companyData')
      const storedCompetitors = localStorage.getItem('competitors')
      const storedTrackingResults = localStorage.getItem('trackingResults')

      if (storedData) this.companyData = JSON.parse(storedData)
      if (storedCompetitors) this.competitors = JSON.parse(storedCompetitors)
      if (storedTrackingResults) this.trackingResults = JSON.parse(storedTrackingResults)
    }
  }

  public static getInstance(): Store {
    if (!Store.instance) {
      Store.instance = new Store()
    }
    return Store.instance
  }

  public setCompanyData(data: CompanyData) {
    this.companyData = data
    if (typeof window !== 'undefined') {
      localStorage.setItem('companyData', JSON.stringify(data))
    }
  }

  public getCompanyData(): CompanyData | null {
    return this.companyData
  }

  public setCompetitors(data: Competitor[]) {
    this.competitors = data
    if (typeof window !== 'undefined') {
      localStorage.setItem('competitors', JSON.stringify(data))
    }
  }

  public getCompetitors(): Competitor[] | null {
    return this.competitors
  }

  public setTrackingResults(data: TrackingResults) {
    this.trackingResults = data
    if (typeof window !== 'undefined') {
      localStorage.setItem('trackingResults', JSON.stringify(data))
    }
  }

  public getTrackingResults(): TrackingResults | null {
    return this.trackingResults
  }

  public clearStore() {
    this.companyData = null
    this.competitors = null
    this.trackingResults = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('companyData')
      localStorage.removeItem('competitors')
      localStorage.removeItem('trackingResults')
    }
  }
}

export const store = Store.getInstance() 