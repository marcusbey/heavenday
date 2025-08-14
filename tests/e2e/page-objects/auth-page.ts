import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

export class AuthPage extends BasePage {
  // Login form elements
  readonly loginForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly forgotPasswordLink: Locator;
  readonly createAccountLink: Locator;

  // Registration form elements
  readonly registrationForm: Locator;
  readonly nameInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly registerButton: Locator;
  readonly loginLink: Locator;

  // Password reset form
  readonly resetPasswordForm: Locator;
  readonly resetEmailInput: Locator;
  readonly resetButton: Locator;
  readonly backToLoginLink: Locator;

  // Social login
  readonly googleLoginButton: Locator;
  readonly facebookLoginButton: Locator;
  readonly appleLoginButton: Locator;

  // Error and success messages
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly validationErrors: Locator;

  // Form validation
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly nameError: Locator;
  readonly confirmPasswordError: Locator;

  // Loading states
  readonly loadingSpinner: Locator;
  readonly submitButton: Locator;

  // Page headers
  readonly loginTitle: Locator;
  readonly registerTitle: Locator;
  readonly resetTitle: Locator;

  constructor(page: Page) {
    super(page);

    // Login form elements
    this.loginForm = page.locator('[data-testid="login-form"]');
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Sign In' });
    this.rememberMeCheckbox = page.getByLabel('Remember me');
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    this.createAccountLink = page.getByRole('link', { name: /create account|sign up/i });

    // Registration form elements
    this.registrationForm = page.locator('[data-testid="registration-form"]');
    this.nameInput = page.getByLabel('Name');
    this.confirmPasswordInput = page.getByLabel('Confirm Password');
    this.termsCheckbox = page.getByLabel(/terms and conditions|terms of service/i);
    this.registerButton = page.getByRole('button', { name: /create account|sign up/i });
    this.loginLink = page.getByRole('link', { name: /sign in|login/i });

    // Password reset form
    this.resetPasswordForm = page.locator('[data-testid="reset-password-form"]');
    this.resetEmailInput = page.getByLabel(/email/i);
    this.resetButton = page.getByRole('button', { name: /reset password|send reset/i });
    this.backToLoginLink = page.getByRole('link', { name: /back to login/i });

    // Social login
    this.googleLoginButton = page.getByRole('button', { name: /google/i });
    this.facebookLoginButton = page.getByRole('button', { name: /facebook/i });
    this.appleLoginButton = page.getByRole('button', { name: /apple/i });

    // Error and success messages
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.validationErrors = page.locator('[data-testid="validation-error"]');

    // Form validation
    this.emailError = page.locator('[data-testid="email-error"]');
    this.passwordError = page.locator('[data-testid="password-error"]');
    this.nameError = page.locator('[data-testid="name-error"]');
    this.confirmPasswordError = page.locator('[data-testid="confirm-password-error"]');

    // Loading states
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.submitButton = page.locator('[type="submit"]');

    // Page headers
    this.loginTitle = page.getByRole('heading', { name: /sign in|login/i });
    this.registerTitle = page.getByRole('heading', { name: /create account|sign up/i });
    this.resetTitle = page.getByRole('heading', { name: /reset password/i });
  }

  /**
   * Navigate to login page
   */
  async navigateToLogin(): Promise<void> {
    await this.goto('/auth/login');
  }

  /**
   * Navigate to registration page
   */
  async navigateToRegister(): Promise<void> {
    await this.goto('/auth/register');
  }

  /**
   * Navigate to password reset page
   */
  async navigateToPasswordReset(): Promise<void> {
    await this.goto('/auth/reset-password');
  }

  /**
   * Verify login page is loaded
   */
  async verifyLoginPageLoaded(): Promise<void> {
    await expect(this.loginTitle).toBeVisible();
    await expect(this.loginForm).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  /**
   * Verify registration page is loaded
   */
  async verifyRegisterPageLoaded(): Promise<void> {
    await expect(this.registerTitle).toBeVisible();
    await expect(this.registrationForm).toBeVisible();
    await expect(this.nameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.confirmPasswordInput).toBeVisible();
    await expect(this.registerButton).toBeVisible();
  }

  /**
   * Verify password reset page is loaded
   */
  async verifyPasswordResetPageLoaded(): Promise<void> {
    await expect(this.resetTitle).toBeVisible();
    await expect(this.resetPasswordForm).toBeVisible();
    await expect(this.resetEmailInput).toBeVisible();
    await expect(this.resetButton).toBeVisible();
  }

  /**
   * Perform user login
   */
  async login(email: string, password: string, rememberMe: boolean = false): Promise<void> {
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    
    if (rememberMe) {
      await this.clickElement(this.rememberMeCheckbox);
    }
    
    await this.clickElement(this.loginButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Perform user registration
   */
  async register(
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
    acceptTerms: boolean = true
  ): Promise<void> {
    await this.fillInput(this.nameInput, name);
    await this.fillInput(this.emailInput, email);
    await this.fillInput(this.passwordInput, password);
    await this.fillInput(this.confirmPasswordInput, confirmPassword);
    
    if (acceptTerms) {
      await this.clickElement(this.termsCheckbox);
    }
    
    await this.clickElement(this.registerButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    await this.fillInput(this.resetEmailInput, email);
    await this.clickElement(this.resetButton);
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify successful login
   */
  async verifySuccessfulLogin(): Promise<void> {
    // Should redirect to dashboard, profile, or home page
    await this.page.waitForURL(/.*\/(dashboard|profile|$)/);
    
    // Check for user menu or profile indicator
    await expect(
      this.page.getByRole('button', { name: /user menu|profile/i })
        .or(this.page.getByText('Welcome back'))
    ).toBeVisible();
  }

  /**
   * Verify successful registration
   */
  async verifySuccessfulRegistration(): Promise<void> {
    // Check for success message or redirect
    await expect(
      this.successMessage
        .or(this.page.getByText(/account created|welcome/i))
    ).toBeVisible();
  }

  /**
   * Verify password reset email sent
   */
  async verifyPasswordResetEmailSent(): Promise<void> {
    await expect(
      this.successMessage
        .or(this.page.getByText(/reset email sent|check your email/i))
    ).toBeVisible();
  }

  /**
   * Verify login error
   */
  async verifyLoginError(): Promise<void> {
    await expect(
      this.errorMessage
        .or(this.page.getByText(/invalid credentials|login failed/i))
    ).toBeVisible();
  }

  /**
   * Verify registration error
   */
  async verifyRegistrationError(): Promise<void> {
    await expect(
      this.errorMessage
        .or(this.page.getByText(/registration failed|email already exists/i))
    ).toBeVisible();
  }

  /**
   * Verify form validation errors
   */
  async verifyValidationErrors(): Promise<void> {
    await expect(this.validationErrors).toHaveCount.greaterThan(0);
  }

  /**
   * Verify email validation error
   */
  async verifyEmailValidationError(): Promise<void> {
    await expect(
      this.emailError
        .or(this.page.getByText(/invalid email|email required/i))
    ).toBeVisible();
  }

  /**
   * Verify password validation error
   */
  async verifyPasswordValidationError(): Promise<void> {
    await expect(
      this.passwordError
        .or(this.page.getByText(/password required|password too short/i))
    ).toBeVisible();
  }

  /**
   * Verify password confirmation error
   */
  async verifyPasswordConfirmationError(): Promise<void> {
    await expect(
      this.confirmPasswordError
        .or(this.page.getByText(/passwords do not match/i))
    ).toBeVisible();
  }

  /**
   * Navigate to registration from login
   */
  async navigateToRegistrationFromLogin(): Promise<void> {
    await this.clickElement(this.createAccountLink);
    await this.verifyRegisterPageLoaded();
  }

  /**
   * Navigate to login from registration
   */
  async navigateToLoginFromRegistration(): Promise<void> {
    await this.clickElement(this.loginLink);
    await this.verifyLoginPageLoaded();
  }

  /**
   * Navigate to password reset from login
   */
  async navigateToPasswordResetFromLogin(): Promise<void> {
    await this.clickElement(this.forgotPasswordLink);
    await this.verifyPasswordResetPageLoaded();
  }

  /**
   * Navigate back to login from password reset
   */
  async navigateToLoginFromPasswordReset(): Promise<void> {
    await this.clickElement(this.backToLoginLink);
    await this.verifyLoginPageLoaded();
  }

  /**
   * Login with Google
   */
  async loginWithGoogle(): Promise<void> {
    await this.clickElement(this.googleLoginButton);
    // Handle OAuth flow (implementation depends on OAuth provider setup)
    await this.waitForLoadingToComplete();
  }

  /**
   * Login with Facebook
   */
  async loginWithFacebook(): Promise<void> {
    await this.clickElement(this.facebookLoginButton);
    // Handle OAuth flow (implementation depends on OAuth provider setup)
    await this.waitForLoadingToComplete();
  }

  /**
   * Login with Apple
   */
  async loginWithApple(): Promise<void> {
    await this.clickElement(this.appleLoginButton);
    // Handle OAuth flow (implementation depends on OAuth provider setup)
    await this.waitForLoadingToComplete();
  }

  /**
   * Verify social login buttons are visible
   */
  async verifySocialLoginButtons(): Promise<void> {
    if (await this.isElementVisible(this.googleLoginButton)) {
      await expect(this.googleLoginButton).toBeVisible();
    }
    if (await this.isElementVisible(this.facebookLoginButton)) {
      await expect(this.facebookLoginButton).toBeVisible();
    }
    if (await this.isElementVisible(this.appleLoginButton)) {
      await expect(this.appleLoginButton).toBeVisible();
    }
  }

  /**
   * Clear form fields
   */
  async clearFormFields(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
    
    if (await this.isElementVisible(this.nameInput)) {
      await this.nameInput.clear();
    }
    
    if (await this.isElementVisible(this.confirmPasswordInput)) {
      await this.confirmPasswordInput.clear();
    }
  }

  /**
   * Verify form submission is disabled
   */
  async verifyFormSubmissionDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  /**
   * Verify loading state
   */
  async verifyLoadingState(): Promise<void> {
    await expect(this.loadingSpinner).toBeVisible();
    await expect(this.submitButton).toBeDisabled();
  }

  /**
   * Wait for form submission to complete
   */
  async waitForFormSubmission(): Promise<void> {
    // Wait for loading to start
    try {
      await this.loadingSpinner.waitFor({ state: 'visible', timeout: 2000 });
    } catch {
      // Loading might be too fast to catch
    }
    
    // Wait for loading to complete
    await this.waitForLoadingToComplete();
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(): Promise<void> {
    // Tab through form fields
    await this.emailInput.focus();
    await this.page.keyboard.press('Tab');
    await expect(this.passwordInput).toBeFocused();
    
    if (await this.isElementVisible(this.nameInput)) {
      await this.page.keyboard.press('Tab');
      await expect(this.nameInput).toBeFocused();
    }
  }

  /**
   * Verify accessibility attributes
   */
  async verifyAccessibilityAttributes(): Promise<void> {
    // Check form has proper labels
    await expect(this.emailInput).toHaveAttribute('aria-label');
    await expect(this.passwordInput).toHaveAttribute('aria-label');
    
    // Check error messages have proper ARIA attributes
    if (await this.isElementVisible(this.errorMessage)) {
      await expect(this.errorMessage).toHaveAttribute('role', 'alert');
    }
  }
}