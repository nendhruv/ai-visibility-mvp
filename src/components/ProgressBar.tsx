'use client'

import { useEffect, useState } from 'react'

interface ProgressBarProps {
  steps: string[];
  currentStep: number;
}

export default function ProgressBar({ steps, currentStep }: ProgressBarProps) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    setWidth((currentStep / (steps.length - 1)) * 100)
  }, [currentStep, steps.length])

  return (
    <div className="mb-8">
      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
              Progress
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-indigo-600">
              {Math.round(width)}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
          <div
            style={{ width: `${width}%` }}
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600 transition-all duration-500"
          ></div>
        </div>
        <div className="flex justify-between">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`text-xs ${
                index <= currentStep ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 