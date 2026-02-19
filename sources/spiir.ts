export namespace Spiir {
  export interface AccountGroup {
    id: string;
    name: string;
    accountType: string;
    accountSubcategoryId: null;
    accountTypeExplicitlySet: boolean;
    bankCredentialId: string;
    balance: number;
    availableBalance: number;
    startDate: Date;
    endDate: Date;
    periods: Period[];
    numberOfPostings: number;
    isAutomatic: boolean;
    bankId: string;
    bankName: string;
    partnerId: null;
    inActive: boolean;
    inActiveBySystem: boolean;
    ownerUserId: string;
    connectionType: string;
    lastUpdated: Date;
  }

  export interface Period {
    accountId: string;
    postingCount: number;
    ignorePostingsBefore: null;
    ignorePostingsAfter: null;
    ignoredPostingCount: number;
    startDate: Date;
    endDate: Date;
    startBalance: number;
    endBalance: number;
    isAutomatic: boolean;
  }
}
