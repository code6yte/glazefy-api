import useSWR, { mutate } from 'swr';
import { menuApi } from './api';

const MENU_KEY = '/api/menu';

export function useMenu() {
    const { data, error, isLoading, isValidating } = useSWR(MENU_KEY, menuApi.getItems, {
        revalidateOnFocus: false,     // Don't revalidate on window focus (save bandwidth)
        dedupingInterval: 60000,      // Dedup request for 1 minute
        keepPreviousData: true,       // Show cached data while revalidating
    });

    const menuItems = data?.menuItems || [];
    const isEmpty = !isLoading && menuItems.length === 0;

    // Add Item
    async function addItem(formData) {
        try {
            await menuApi.addItem(formData);
            mutate(MENU_KEY); // Revalidate cache
            return true;
        } catch (err) {
            throw err;
        }
    }

    // Update Item
    async function updateItem(id, updates) {
        try {
            // Optimistic UI update could go here, but for now we just revalidate
            await menuApi.updateItem(id, updates);
            mutate(MENU_KEY);
            return true;
        } catch (err) {
            throw err;
        }
    }

    // Delete Item
    async function deleteItem(id) {
        try {
            // Optimistic update
            mutate(MENU_KEY, (currentData) => {
                return {
                    ...currentData,
                    menuItems: currentData.menuItems.filter(item => item.id !== id)
                };
            }, false);

            await menuApi.deleteItem(id);
            mutate(MENU_KEY); // Revalidate to be sure
            return true;
        } catch (err) {
            mutate(MENU_KEY); // Revert on error
            throw err;
        }
    }

    return {
        items: menuItems,
        isLoading,
        isValidating,
        isEmpty,
        error,
        addItem,
        updateItem,
        deleteItem,
        refresh: () => mutate(MENU_KEY)
    };
}
