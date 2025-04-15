'use client'

import { useState } from 'react'
import { CompanyData, Competitor } from '@/types'

interface StepProps {
  currentStep: number;
  totalSteps: number;
}

export const StepIndicator = ({ currentStep, totalSteps }: StepProps) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div key={index} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              index + 1 <= currentStep ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}>
              {index + 1}
            </div>
            {index < totalSteps - 1 && (
              <div className={`h-1 w-16 ${
                index + 1 < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 