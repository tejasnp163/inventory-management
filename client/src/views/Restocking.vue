<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()

const forecasts = ref([])
const budget = ref(50000)
const overrides = ref(new Set())
const loading = ref(false)
const error = ref(null)
const submitting = ref(false)
const orderSuccess = ref(false)

const recommendedItems = computed(() => {
  const increasing = forecasts.value.filter(item => item.trend === 'increasing')

  const sorted = [...increasing].sort((a, b) => {
    const pctA = (a.forecasted_demand - a.current_demand) / a.current_demand
    const pctB = (b.forecasted_demand - b.current_demand) / b.current_demand
    return pctB - pctA
  })

  let remaining = budget.value

  return sorted.map(item => {
    const pctChange = ((item.forecasted_demand - item.current_demand) / item.current_demand) * 100
    const line_cost = item.forecasted_demand * item.unit_cost
    const autoIncluded = line_cost <= remaining

    if (autoIncluded) {
      remaining -= line_cost
    }

    const included = overrides.value.has(item.item_sku) ? !autoIncluded : autoIncluded

    return {
      ...item,
      pctChange,
      line_cost,
      included
    }
  })
})

const selectedItems = computed(() => recommendedItems.value.filter(item => item.included))

const totalCost = computed(() => selectedItems.value.reduce((sum, item) => sum + item.line_cost, 0))

const budgetUsagePct = computed(() => Math.min((totalCost.value / budget.value) * 100, 100))

const isOverBudget = computed(() => totalCost.value > budget.value)

const formatCurrency = (value) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const formatCurrencyFull = (value) =>
  value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const toggleOverride = (sku) => {
  const next = new Set(overrides.value)
  if (next.has(sku)) {
    next.delete(sku)
  } else {
    next.add(sku)
  }
  overrides.value = next
}

const placeOrder = async () => {
  if (selectedItems.value.length === 0) return

  submitting.value = true
  error.value = null

  try {
    await api.createRestockingOrder(
      selectedItems.value.map(i => ({
        sku: i.item_sku,
        name: i.item_name,
        quantity: i.forecasted_demand,
        unit_cost: i.unit_cost
      }))
    )
    orderSuccess.value = true
    overrides.value = new Set()
  } catch (err) {
    error.value = 'Failed to place restocking order: ' + (err.message || err)
    console.error(err)
  } finally {
    submitting.value = false
  }
}

const loadData = async () => {
  loading.value = true
  error.value = null
  try {
    forecasts.value = await api.getDemandForecasts()
  } catch (err) {
    error.value = 'Failed to load demand forecasts: ' + (err.message || err)
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadData())
</script>

<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t('restocking.title') }}</h2>
      <p>{{ t('restocking.description') }}</p>
    </div>

    <!-- Budget Slider -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">{{ t('restocking.budgetLabel') }}</h3>
      </div>
      <div class="budget-display">{{ formatCurrency(budget) }}</div>
      <input
        type="range"
        class="budget-slider"
        :min="1000"
        :max="200000"
        :step="1000"
        v-model.number="budget"
      />
      <div class="budget-bar-outer">
        <div
          class="budget-bar-fill"
          :class="{ 'over-budget': isOverBudget }"
          :style="{ width: budgetUsagePct + '%' }"
        />
      </div>
      <div class="budget-usage">
        Using {{ formatCurrency(totalCost) }} of {{ formatCurrency(budget) }} budget
      </div>
    </div>

    <!-- Recommendations Table -->
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">{{ t('restocking.recommendedItems') }}</h3>
      </div>

      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="recommendedItems.length === 0" class="loading">
        {{ t('restocking.noIncreasingItems') }}
      </div>
      <div v-else class="table-container">
        <table>
          <thead>
            <tr>
              <th>{{ t('restocking.table.sku') }}</th>
              <th>{{ t('restocking.table.itemName') }}</th>
              <th>{{ t('restocking.table.currentDemand') }}</th>
              <th>{{ t('restocking.table.forecastedDemand') }}</th>
              <th>{{ t('restocking.table.change') }}</th>
              <th>{{ t('restocking.table.qtyToOrder') }}</th>
              <th>{{ t('restocking.table.unitCost') }}</th>
              <th>{{ t('restocking.table.estCost') }}</th>
              <th>{{ t('restocking.table.include') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in recommendedItems"
              :key="item.item_sku"
              :class="{ 'row-excluded': !item.included }"
            >
              <td><strong>{{ item.item_sku }}</strong></td>
              <td>{{ item.item_name }}</td>
              <td>{{ item.current_demand.toLocaleString() }}</td>
              <td><strong>{{ item.forecasted_demand.toLocaleString() }}</strong></td>
              <td>
                <span style="color: #059669; font-weight: 600;">
                  +{{ item.pctChange.toFixed(1) }}%
                </span>
              </td>
              <td>{{ item.forecasted_demand.toLocaleString() }}</td>
              <td>{{ formatCurrencyFull(item.unit_cost) }}</td>
              <td>{{ formatCurrencyFull(item.line_cost) }}</td>
              <td>
                <input
                  type="checkbox"
                  :checked="item.included"
                  @change="toggleOverride(item.item_sku)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Order Actions -->
    <div class="card">
      <div v-if="orderSuccess" class="success-banner">
        {{ t('restocking.orderSuccess') }}
      </div>
      <div class="order-actions">
        <div class="order-total">
          Total: {{ formatCurrencyFull(totalCost) }}
        </div>
        <button
          class="btn-primary"
          @click="placeOrder"
          :disabled="selectedItems.length === 0 || submitting"
        >
          {{ t('restocking.placeOrder') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.restocking {
  padding: 0;
}

.budget-slider {
  width: 100%;
  margin: 1rem 0;
  accent-color: #2563eb;
}

.budget-display {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.budget-bar-outer {
  background: #e2e8f0;
  border-radius: 4px;
  height: 8px;
  margin-top: 0.5rem;
}

.budget-bar-fill {
  height: 8px;
  border-radius: 4px;
  background: #2563eb;
  transition: width 0.3s ease;
}

.budget-bar-fill.over-budget {
  background: #dc2626;
}

.budget-usage {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.5rem;
}

.row-excluded {
  opacity: 0.4;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-size: 0.938rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.order-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
}

.order-total {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
}

.success-banner {
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  color: #065f46;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-weight: 500;
}
</style>
