/**
 * Logic to check if a user is eligible for a scheme.
 * @param {Object} scheme - Scheme data
 * @param {Object} user - User profile (age, income, occupation, location, etc.)
 * @returns {String} - 'eligible', 'docs_needed', 'not_eligible'
 */
const checkEligibility = (scheme, user) => {
    if (!user) return 'docs_needed';

    const { eligibility } = scheme;
    let status = 'eligible';

    // State Match
    if (eligibility.state && user.state && eligibility.state !== user.state) {
        return 'not_eligible';
    }

    // Age Match
    if (eligibility.min_age && user.age && user.age < eligibility.min_age) {
        return 'not_eligible';
    }

    // Income Match
    if (eligibility.income_limit && user.income && user.income > eligibility.income_limit) {
        return 'not_eligible';
    }

    // Occupation Match
    if (eligibility.occupation && user.occupation) {
        const isOk = eligibility.occupation.some(occ =>
            user.occupation.toLowerCase().includes(occ.toLowerCase())
        );
        if (!isOk) status = 'docs_needed';
    }

    // Generic check for missing info
    const requiredFields = ['age', 'income', 'occupation', 'state'];
    const missingFields = requiredFields.filter(field => !user[field]);

    if (missingFields.length > 0 && status === 'eligible') {
        return 'docs_needed';
    }

    return status;
};

module.exports = { checkEligibility };
