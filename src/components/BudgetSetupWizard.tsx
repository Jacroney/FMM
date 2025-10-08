import React, { useState } from 'react';
import { Check, X, DollarSign, Calendar, ArrowRight, ArrowLeft, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { ExpenseService } from '../services/expenseService';

interface RecommendedCategory {
  name: string;
  type: 'Fixed Costs' | 'Operational Costs' | 'Event Costs';
  description: string;
  suggestedAmount: number;
  required: boolean;
}

const RECOMMENDED_CATEGORIES: RecommendedCategory[] = [
  // Fixed Costs
  {
    name: 'IFC Dues',
    type: 'Fixed Costs',
    description: 'Inter-Fraternity Council membership fees',
    suggestedAmount: 500,
    required: true
  },
  {
    name: 'National Chapter Dues',
    type: 'Fixed Costs',
    description: 'National headquarters membership fees',
    suggestedAmount: 2000,
    required: true
  },
  {
    name: 'Rent',
    type: 'Fixed Costs',
    description: 'House rent or facility lease payments',
    suggestedAmount: 5000,
    required: false
  },
  {
    name: 'Utilities',
    type: 'Fixed Costs',
    description: 'Water, electricity, gas, internet',
    suggestedAmount: 800,
    required: false
  },
  {
    name: 'Insurance',
    type: 'Fixed Costs',
    description: 'Property and liability insurance',
    suggestedAmount: 1200,
    required: false
  },

  // Operational Costs
  {
    name: 'House Maintenance',
    type: 'Operational Costs',
    description: 'Repairs, cleaning supplies, general upkeep',
    suggestedAmount: 1000,
    required: false
  },
  {
    name: 'Brotherhood Events',
    type: 'Operational Costs',
    description: 'Member bonding activities and dinners',
    suggestedAmount: 800,
    required: false
  },
  {
    name: 'Philanthropy',
    type: 'Operational Costs',
    description: 'Charitable events and donations',
    suggestedAmount: 600,
    required: false
  },
  {
    name: 'Marketing & Recruitment',
    type: 'Operational Costs',
    description: 'Rush materials, advertising, chapter promotion',
    suggestedAmount: 500,
    required: false
  },
  {
    name: 'Office Supplies',
    type: 'Operational Costs',
    description: 'Printing, paper, general supplies',
    suggestedAmount: 200,
    required: false
  },

  // Event Costs
  {
    name: 'Social Events',
    type: 'Event Costs',
    description: 'Parties, mixers, and social gatherings',
    suggestedAmount: 2000,
    required: false
  },
  {
    name: 'Formal Events',
    type: 'Event Costs',
    description: 'Formal dances and date functions',
    suggestedAmount: 3000,
    required: false
  },
  {
    name: 'Homecoming & Traditions',
    type: 'Event Costs',
    description: 'Homecoming activities and annual traditions',
    suggestedAmount: 1500,
    required: false
  },
  {
    name: 'Alumni Events',
    type: 'Event Costs',
    description: 'Alumni reunions and gatherings',
    suggestedAmount: 800,
    required: false
  }
];

interface BudgetSetupWizardProps {
  chapterId: string;
  onComplete: () => void;
}

type Step = 'welcome' | 'categories' | 'period' | 'amounts' | 'review';

const BudgetSetupWizard: React.FC<BudgetSetupWizardProps> = ({ chapterId, onComplete }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(RECOMMENDED_CATEGORIES.filter(c => c.required).map(c => c.name))
  );
  const [categoryAmounts, setCategoryAmounts] = useState<Record<string, number>>(
    Object.fromEntries(RECOMMENDED_CATEGORIES.map(c => [c.name, c.suggestedAmount]))
  );
  const [periodName, setPeriodName] = useState('Fall 2025');
  const [periodType, setPeriodType] = useState<'Quarter' | 'Semester' | 'Year'>('Semester');
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState('2026-01-15');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCategory = (categoryName: string) => {
    const category = RECOMMENDED_CATEGORIES.find(c => c.name === categoryName);
    if (category?.required) return; // Can't deselect required categories

    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName);
    } else {
      newSelected.add(categoryName);
    }
    setSelectedCategories(newSelected);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Step 1: Create the budget period
      const period = await ExpenseService.addPeriod(chapterId, {
        name: periodName,
        type: periodType,
        start_date: startDate,
        end_date: endDate,
        fiscal_year: new Date(startDate).getFullYear(),
        is_current: true
      });

      // Step 2: Create selected categories
      const categoriesMap = new Map<string, string>();
      for (const recCat of RECOMMENDED_CATEGORIES) {
        if (selectedCategories.has(recCat.name)) {
          const category = await ExpenseService.addCategory(chapterId, {
            name: recCat.name,
            type: recCat.type,
            description: recCat.description,
            is_active: true
          });
          categoriesMap.set(recCat.name, category.id);
        }
      }

      // Step 3: Create budget allocations
      const { BudgetService } = await import('../services/budgetService');
      for (const [categoryName, categoryId] of categoriesMap.entries()) {
        const amount = categoryAmounts[categoryName] || 0;
        if (amount > 0) {
          await BudgetService.updateBudgetAllocation(
            chapterId,
            categoryId,
            period.id,
            amount
          );
        }
      }

      toast.success('Budget setup complete!');
      onComplete();
    } catch (error) {
      console.error('Error setting up budget:', error);
      toast.error('Failed to set up budget. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderWelcome = () => (
    <div className="text-center py-12">
      <div className="mb-6">
        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to Budget Setup
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Let's get your chapter's budget organized. We'll guide you through setting up
          budget categories and allocations based on common fraternity expenses.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 max-w-2xl mx-auto mb-8">
        <div className="flex items-start gap-3 text-left">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              What we'll set up:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Budget categories tailored for fraternity chapters</li>
              <li>• A budget period (semester, quarter, or year)</li>
              <li>• Recommended budget allocations you can customize</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={() => setStep('categories')}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
      >
        Get Started
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const renderCategories = () => {
    const groupedCategories = {
      'Fixed Costs': RECOMMENDED_CATEGORIES.filter(c => c.type === 'Fixed Costs'),
      'Operational Costs': RECOMMENDED_CATEGORIES.filter(c => c.type === 'Operational Costs'),
      'Event Costs': RECOMMENDED_CATEGORIES.filter(c => c.type === 'Event Costs')
    };

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Select Budget Categories
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Choose the categories that match your chapter's needs. Required categories are pre-selected.
          </p>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedCategories).map(([type, categories]) => (
            <div key={type}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {type}
              </h3>
              <div className="space-y-2">
                {categories.map(category => {
                  const isSelected = selectedCategories.has(category.name);
                  const isRequired = category.required;

                  return (
                    <div
                      key={category.name}
                      onClick={() => !isRequired && toggleCategory(category.name)}
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      } ${isRequired ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'border-2 border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {category.name}
                            </h4>
                            {isRequired && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {category.description}
                          </p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            Suggested: ${category.suggestedAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep('welcome')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => setStep('period')}
            disabled={selectedCategories.size === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Budget Period
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderPeriod = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Set Budget Period
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Define the time period for this budget. Most chapters use semesters.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Period Name
          </label>
          <input
            type="text"
            value={periodName}
            onChange={(e) => setPeriodName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            placeholder="e.g., Fall 2025, Q1 2025"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Period Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['Quarter', 'Semester', 'Year'] as const).map(type => (
              <button
                key={type}
                onClick={() => setPeriodType(type)}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  periodType === type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep('categories')}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => setStep('amounts')}
          disabled={!periodName.trim() || !startDate || !endDate}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Set Amounts
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderAmounts = () => {
    const selectedCategoriesArray = RECOMMENDED_CATEGORIES.filter(c =>
      selectedCategories.has(c.name)
    );

    const totalBudget = selectedCategoriesArray.reduce(
      (sum, cat) => sum + (categoryAmounts[cat.name] || 0),
      0
    );

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Set Budget Amounts
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Customize the budget for each category. We've suggested typical amounts.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Total Budget:
            </span>
            <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              ${totalBudget.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {selectedCategoriesArray.map(category => (
            <div
              key={category.name}
              className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {category.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {category.type}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">$</span>
                  <input
                    type="number"
                    value={categoryAmounts[category.name] || 0}
                    onChange={(e) =>
                      setCategoryAmounts({
                        ...categoryAmounts,
                        [category.name]: Number(e.target.value)
                      })
                    }
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-right"
                    min="0"
                    step="100"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep('period')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => setStep('review')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            Review & Finish
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderReview = () => {
    const selectedCategoriesArray = RECOMMENDED_CATEGORIES.filter(c =>
      selectedCategories.has(c.name)
    );

    const totalBudget = selectedCategoriesArray.reduce(
      (sum, cat) => sum + (categoryAmounts[cat.name] || 0),
      0
    );

    const groupedByType = selectedCategoriesArray.reduce((acc, cat) => {
      if (!acc[cat.type]) acc[cat.type] = [];
      acc[cat.type].push(cat);
      return acc;
    }, {} as Record<string, typeof selectedCategoriesArray>);

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Review Your Budget
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Double-check everything looks correct before we set up your budget.
          </p>
        </div>

        {/* Period Info */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Budget Period
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Name:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{periodName}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Type:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{periodType}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Start:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {new Date(startDate).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">End:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {new Date(endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Budget Breakdown
          </h3>

          <div className="space-y-6">
            {Object.entries(groupedByType).map(([type, categories]) => {
              const typeTotal = categories.reduce(
                (sum, cat) => sum + (categoryAmounts[cat.name] || 0),
                0
              );

              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">{type}</h4>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${typeTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-2 ml-4">
                    {categories.map(cat => (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-600 dark:text-gray-400">{cat.name}</span>
                        <span className="text-gray-900 dark:text-white">
                          ${(categoryAmounts[cat.name] || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  Total Budget
                </span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${totalBudget.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep('amounts')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Complete Setup
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Progress indicator */}
          {step !== 'welcome' && (
            <div className="mb-8">
              <div className="flex items-center justify-between text-sm">
                {['categories', 'period', 'amounts', 'review'].map((s, idx) => (
                  <React.Fragment key={s}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step === s
                            ? 'bg-blue-600 text-white'
                            : ['categories', 'period', 'amounts', 'review'].indexOf(step) >
                              ['categories', 'period', 'amounts', 'review'].indexOf(s as Step)
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                        }`}
                      >
                        {['categories', 'period', 'amounts', 'review'].indexOf(step) >
                        ['categories', 'period', 'amounts', 'review'].indexOf(s as Step) ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span className="capitalize hidden sm:inline">{s}</span>
                    </div>
                    {idx < 3 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          ['categories', 'period', 'amounts', 'review'].indexOf(step) > idx
                            ? 'bg-green-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Step content */}
          {step === 'welcome' && renderWelcome()}
          {step === 'categories' && renderCategories()}
          {step === 'period' && renderPeriod()}
          {step === 'amounts' && renderAmounts()}
          {step === 'review' && renderReview()}
        </div>
      </div>
    </div>
  );
};

export default BudgetSetupWizard;
