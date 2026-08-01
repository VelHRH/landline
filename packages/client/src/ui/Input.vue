<script setup lang="ts">
const model = defineModel<string>({ required: true });

defineProps<{
  label: string;
  type?: string;
  autocomplete?: string;
  required?: boolean;
  error?: string;
}>();
</script>

<template>
  <label class="block">
    <span class="mb-2 block text-caption text-muted-foreground">{{ label }}</span>
    <input
      v-model="model"
      :type="type ?? 'text'"
      :autocomplete="autocomplete"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      class="w-full rounded-md border border-input bg-card px-3.5 py-2.5 text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
    />
    <span v-if="error" class="mt-2 block text-caption text-destructive">{{ error }}</span>
  </label>
</template>
