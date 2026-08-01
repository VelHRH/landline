<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { searchCities, type CityOption } from "./city.service";

// The resolved selection: the chosen city's CityId as a string, or null.
const selectedId = defineModel<string | null>({ default: null });

withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
  }>(),
  { label: "City", placeholder: "Start typing a city…" },
);

const query = ref("");
const selectedLabel = ref<string | null>(null);
const options = ref<ReadonlyArray<CityOption>>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const open = ref(false);

const DEBOUNCE_MS = 200;
let debounce: ReturnType<typeof setTimeout> | undefined;
// Guards a slow earlier request from overwriting a newer one's results.
let requestSeq = 0;

const reset = () => {
  options.value = [];
  loading.value = false;
  error.value = null;
  open.value = false;
};

const run = async (text: string) => {
  const seq = ++requestSeq;
  loading.value = true;
  error.value = null;
  const result = await searchCities(text);
  if (seq !== requestSeq) return;
  loading.value = false;
  if (result.ok) {
    options.value = result.data;
    open.value = true;
  } else {
    error.value = result.message;
    options.value = [];
  }
};

watch(query, (text) => {
  if (selectedId.value !== null && text === selectedLabel.value) return;

  // Typing invalidates any prior resolution until a city is picked again.
  selectedId.value = null;
  selectedLabel.value = null;
  if (debounce) clearTimeout(debounce);

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    reset();
    return;
  }
  debounce = setTimeout(() => void run(trimmed), DEBOUNCE_MS);
});

const select = (option: CityOption) => {
  selectedId.value = option.id;
  selectedLabel.value = option.label;
  query.value = option.label;
  reset();
};

onBeforeUnmount(() => {
  if (debounce) clearTimeout(debounce);
});
</script>

<template>
  <div class="relative">
    <label class="block">
      <span class="mb-2 block text-caption text-muted-foreground">{{ label }}</span>
      <input
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        :aria-expanded="open"
        :placeholder="placeholder"
        class="w-full rounded-md border border-input bg-card px-3.5 py-2.5 text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
        @focus="options.length > 0 && (open = true)"
      />
    </label>

    <p v-if="loading" class="mt-2 text-caption text-muted-foreground">Searching…</p>
    <p v-else-if="error" role="alert" class="mt-2 text-caption text-destructive">{{ error }}</p>

    <ul
      v-if="open && options.length > 0"
      role="listbox"
      class="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-card shadow-sm"
    >
      <li
        v-for="option in options"
        :key="option.id"
        role="option"
        :aria-selected="selectedId === option.id"
        class="cursor-pointer px-3.5 py-2.5 hover:bg-muted"
        @mousedown.prevent="select(option)"
      >
        {{ option.label }}
      </li>
    </ul>

    <p
      v-else-if="open && !loading && query.trim().length > 0"
      class="mt-2 text-caption text-muted-foreground"
    >
      No cities found.
    </p>
  </div>
</template>
