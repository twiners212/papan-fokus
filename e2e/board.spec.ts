import { test, expect } from '@playwright/test';

test.describe('Kanban Board E2E', () => {

  test('should register, create a workspace, and display board UI', async ({ page }) => {
    const uniqueId = Date.now();
    const testEmail = `e2e_${uniqueId}@example.com`;
    const testPassword = 'Password123!';
    const workspaceName = `Test Workspace ${uniqueId}`;

    // 1. Go to register page
    await page.goto('/register');

    // 2. Fill registration form
    await page.fill('input[type="text"]', 'E2E User');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Submit registration
    await page.getByRole('button', { name: /sign up/i }).click();

    // 3. Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    
    // Verify dashboard loaded by looking for Create Workspace trigger
    const createTrigger = page.locator('text=Create Workspace');
    await expect(createTrigger.first()).toBeVisible();

    // 4. Create a new workspace
    await createTrigger.first().click();
    
    // Fill workspace name in the dialog
    await page.getByLabel(/workspace name/i).fill(workspaceName);
    
    // Submit create workspace
    await page.getByRole('button', { name: /^create workspace$/i }).click();

    // 5. Wait for redirect to board (slug will be test-workspace-[id])
    await page.waitForURL(`**/*/board`);

    // 6. Verify Board UI
    const emptyStateHeading = page.getByText(/welcome to your new board/i);
    const generateBtn = page.getByRole('button', { name: /generate default columns/i });

    // Wait for the empty state to appear
    await expect(emptyStateHeading).toBeVisible({ timeout: 10000 });

    // 7. Click generate default columns
    await generateBtn.click();

    // 8. Wait for "To Do" column to appear
    await expect(page.getByText('To Do', { exact: true })).toBeVisible({ timeout: 10000 });
  });
});
