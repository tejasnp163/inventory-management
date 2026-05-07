<template>
  <BaseModal
    :is-open="isOpen && !!backlogItem"
    :title="mode === 'create' ? 'Create Purchase Order' : 'Purchase Order Details'"
    @close="close"
  >
    <div class="item-header">
      <div class="item-info">
        <h4 class="item-name">{{ backlogItem.item_name }}</h4>
        <div class="item-sku">SKU: {{ backlogItem.item_sku }}</div>
      </div>
    </div>

    <!-- Create mode: form -->
    <form v-if="mode === 'create'" class="po-form" @submit.prevent="submitPO">
      <div class="form-group">
        <label class="form-label" for="po-supplier">Supplier Name</label>
        <input
          id="po-supplier"
          v-model="supplierName"
          type="text"
          class="form-input"
          placeholder="Enter supplier name"
          required
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="po-quantity">Quantity</label>
        <div class="form-static">{{ backlogItem.quantity_needed - backlogItem.quantity_available }} units</div>
      </div>

      <div class="form-group">
        <label class="form-label" for="po-date">Expected Delivery Date</label>
        <input
          id="po-date"
          v-model="expectedDate"
          type="date"
          class="form-input"
          required
        />
      </div>

      <div class="form-footer">
        <button type="button" class="btn-secondary" @click="close">Cancel</button>
        <button type="submit" class="btn-primary">Create PO</button>
      </div>
    </form>

    <!-- View mode: read-only details -->
    <div v-else class="po-details">
      <div v-if="backlogItem.purchase_order" class="info-grid">
        <div class="info-item">
          <div class="info-label">PO ID</div>
          <div class="info-value po-id">{{ backlogItem.purchase_order.id }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Supplier</div>
          <div class="info-value">{{ backlogItem.purchase_order.supplier }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Quantity</div>
          <div class="info-value">{{ backlogItem.purchase_order.quantity }} units</div>
        </div>
        <div class="info-item">
          <div class="info-label">Expected Date</div>
          <div class="info-value">{{ formatDate(backlogItem.purchase_order.expected_date) }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Status</div>
          <div class="info-value">
            <span class="badge" :class="statusBadgeClass(backlogItem.purchase_order.status)">
              {{ backlogItem.purchase_order.status }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="no-po">No purchase order found</div>
    </div>

    <template v-if="mode === 'view'" #footer>
      <button class="btn-secondary" @click="close">Close</button>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import { formatDate } from '../utils/date'
import BaseModal from './BaseModal.vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  backlogItem: {
    type: Object,
    default: null
  },
  mode: {
    type: String,
    default: 'create' // 'create' | 'view'
  }
})

const emit = defineEmits(['close', 'po-created'])

const supplierName = ref('')
const expectedDate = ref('')

const close = () => {
  supplierName.value = ''
  expectedDate.value = ''
  emit('close')
}

const submitPO = () => {
  const po = {
    id: 'PO-' + Date.now(),
    backlog_item_id: props.backlogItem.id,
    supplier: supplierName.value,
    quantity: props.backlogItem.quantity_needed - props.backlogItem.quantity_available,
    expected_date: expectedDate.value,
    status: 'pending'
  }
  emit('po-created', po)
  close()
}

const statusBadgeClass = (status) => {
  if (!status) return ''
  switch (status.toLowerCase()) {
    case 'pending': return 'warning'
    case 'approved': return 'info'
    case 'delivered': return 'success'
    case 'cancelled': return 'danger'
    default: return ''
  }
}
</script>

<style scoped>
.item-header {
  padding-bottom: 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
}

.item-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.375rem 0;
}

.item-sku {
  font-size: 0.875rem;
  color: #64748b;
  font-family: 'Monaco', 'Courier New', monospace;
}

.po-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.813rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.form-input {
  padding: 0.625rem 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.938rem;
  color: #0f172a;
  font-family: inherit;
  transition: border-color 0.15s ease;
  outline: none;
}

.form-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-static {
  font-size: 0.938rem;
  color: #0f172a;
  font-weight: 500;
  padding: 0.625rem 0;
}

/* Footer inside create-mode form (not the BaseModal footer slot) */
.form-footer {
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.813rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.info-value {
  font-size: 0.938rem;
  color: #0f172a;
  font-weight: 500;
}

.info-value.po-id {
  font-family: 'Monaco', 'Courier New', monospace;
  color: #2563eb;
}

.no-po {
  padding: 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.938rem;
}

.po-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.btn-secondary {
  padding: 0.625rem 1.25rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-secondary:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.btn-primary {
  padding: 0.625rem 1.25rem;
  background: #2563eb;
  border: 1px solid #2563eb;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  color: white;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-primary:hover {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.badge {
  display: inline-block;
  padding: 0.313rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.badge.success {
  background: #d1fae5;
  color: #065f46;
}

.badge.warning {
  background: #fed7aa;
  color: #92400e;
}

.badge.danger {
  background: #fecaca;
  color: #991b1b;
}

.badge.info {
  background: #dbeafe;
  color: #1e40af;
}
</style>
