export interface AutocompleteResult {
  type: 'product' | 'category';
  id: string;
  name: string;
  description?: string;
  category?: string;
  imageUrl?: string;
}
