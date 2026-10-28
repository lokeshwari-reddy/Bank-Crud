
const form = document.getElementById("accountForm");
const accountList = document.getElementById("accountList");
const searchInput = document.getElementById("search");
const editIdInput = document.getElementById("editId");
const balanceField = document.getElementById("balanceField");
const balanceInput = document.getElementById("balance");

const STORAGE_KEY = "bankingSystemAccounts";

let accounts = loadAccounts();

// Load saved accounts from localStorage
function loadAccounts() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const data = saved ? JSON.parse(saved) : [];

        return Array.isArray(data) ? data.filter(account =>
            account &&
            typeof account.id === "string" &&
            typeof account.accountNo === "string" &&
            typeof account.name === "string" &&
            typeof account.balance === "number" &&
            Number.isFinite(account.balance) &&
            account.balance >= 0
        ) : [];
    } catch (error) {
        alert("Could not load saved data. Please check browser storage.");
        return [];
    }
}

// Save accounts to localStorage
function saveAccounts() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
        return true;
    } catch (error) {
        alert("Could not save data. Browser storage may be full or disabled.");
        return false;
    }
}

// Generate a unique ID for each account
function generateId() {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString() + Math.random().toString(36).slice(2);
}

// Generate an account number
function generateAccountNumber() {
    let accountNo;

    do {
        accountNo = "BK" + Math.floor(10000000 +
            Math.random() * 90000000);
    } while (accounts.some(account =>
        account.accountNo === accountNo
    ));

    return accountNo;
}

// Format amounts as Indian Rupees
function formatMoney(amount) {
    return amount.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR"
    });
}

// Escape user input before displaying it as HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Display accounts and summary information
function renderAccounts() {
    const keyword = searchInput.value.trim().toLowerCase();

    const filteredAccounts = accounts.filter(account =>
        account.name.toLowerCase().includes(keyword) ||
        account.accountNo.toLowerCase().includes(keyword)
    );

    document.getElementById("totalAccounts").textContent =
        accounts.length;

    const total = accounts.reduce(
        (sum, account) => sum + account.balance, 0
    );

    document.getElementById("totalBalance").textContent =
        formatMoney(total);

    document.getElementById("emptyMessage").hidden =
        filteredAccounts.length > 0;

    accountList.innerHTML = filteredAccounts.map(account => `
        <tr>
            <td>${escapeHTML(account.accountNo)}</td>
            <td>${escapeHTML(account.name)}</td>
            <td>${escapeHTML(account.email)}</td>
            <td>${escapeHTML(account.phone)}</td>
            <td>${escapeHTML(account.accountType)}</td>
            <td>${formatMoney(account.balance)}</td>
            <td class="actions">
                <button class="edit-btn"
                    data-action="edit" data-id="${escapeHTML(account.id)}">
                    Edit
                </button>
                <button class="deposit-btn"
                    data-action="deposit" data-id="${escapeHTML(account.id)}">
                    Deposit
                </button>
                <button class="withdraw-btn"
                    data-action="withdraw" data-id="${escapeHTML(account.id)}">
                    Withdraw
                </button>
                <button class="delete-btn"
                    data-action="delete" data-id="${escapeHTML(account.id)}">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}

// CREATE and UPDATE operations
form.addEventListener("submit", function(event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const accountType = document.getElementById("accountType").value;
    const editId = editIdInput.value;

    if (!name || !email || !/^[0-9]{10}$/.test(phone)) {
        alert("Please enter valid customer details.");
        return;
    }

    if (editId) {
        // UPDATE an existing account
        const index = accounts.findIndex(account =>
            account.id === editId
        );

        if (index === -1) {
            alert("Account not found.");
            resetForm();
            return;
        }

        const updatedAccounts = accounts.map(account =>
            account.id === editId
                ? { ...account, name, email, phone, accountType }
                : account
        );

        const previousAccounts = accounts;
        accounts = updatedAccounts;

        if (!saveAccounts()) {
            accounts = previousAccounts;
            return;
        }

        alert("Account details updated successfully!");
    } else {
        // CREATE a new account
        const initialBalance = Number(balanceInput.value);

        if (
            !Number.isFinite(initialBalance) ||
            initialBalance < 0 ||
            !Number.isSafeInteger(Math.round(initialBalance * 100))
        ) {
            alert("Please enter a valid initial deposit.");
            return;
        }

        const newAccount = {
            id: generateId(),
            accountNo: generateAccountNumber(),
            name,
            email,
            phone,
            accountType,
            balance: Math.round(initialBalance * 100) / 100
        };

        accounts.push(newAccount);

        if (!saveAccounts()) {
            accounts.pop();
            return;
        }

        alert("Account created successfully!\nAccount Number: " +
            newAccount.accountNo);
    }

    resetForm();
    renderAccounts();
});

// READ: show all accounts on page load
// UPDATE: fill the form with existing details
// DELETE: remove the selected account
accountList.addEventListener("click", function(event) {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const id = button.dataset.id;
    const action = button.dataset.action;

    const account = accounts.find(item => item.id === id);

    if (!account) {
        alert("Account not found.");
        return;
    }

    if (action === "edit") {
        editIdInput.value = account.id;

        document.getElementById("name").value = account.name;
        document.getElementById("email").value = account.email;
        document.getElementById("phone").value = account.phone;
        document.getElementById("accountType").value =
            account.accountType;

        document.getElementById("formTitle").textContent =
            "Update Account Details";

        document.getElementById("submitBtn").textContent =
            "Save Changes";

        // Account balance changes only through deposit/withdrawal
        balanceField.hidden = true;
        balanceInput.required = false;

        document.getElementById("name").focus();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (action === "delete") {
        const confirmed = confirm(
            `Delete account ${account.accountNo} belonging to ${account.name}?`
        );

        if (!confirmed) return;

        const previousAccounts = accounts;
        accounts = accounts.filter(item => item.id !== id);

        if (!saveAccounts()) {
            accounts = previousAccounts;
            return;
        }

        if (editIdInput.value === id) resetForm();

        renderAccounts();
        alert("Account deleted successfully!");
    }

    if (action === "deposit" || action === "withdraw") {
        handleTransaction(account, action);
    }
});

// Deposit and withdrawal operations
function handleTransaction(account, action) {
    const label = action === "deposit" ? "deposit" : "withdraw";

    const input = prompt(
        `Enter amount to ${label} for account ${account.accountNo}:`
    );

    if (input === null) return;

    const amount = Number(input.trim());

    if (
        input.trim() === "" ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !Number.isSafeInteger(Math.round(amount * 100))
    ) {
        alert("Please enter a valid positive amount.");
        return;
    }

    const amountInPaise = Math.round(amount * 100);
    const balanceInPaise = Math.round(account.balance * 100);

    if (action === "withdraw" && amountInPaise > balanceInPaise) {
        alert("Insufficient balance!");
        return;
    }

    const newBalanceInPaise = action === "deposit"
        ? balanceInPaise + amountInPaise
        : balanceInPaise - amountInPaise;

    if (!Number.isSafeInteger(newBalanceInPaise)) {
        alert("Amount is too large.");
        return;
    }

    const previousAccounts = accounts;

    accounts = accounts.map(item =>
        item.id === account.id
            ? { ...item, balance: newBalanceInPaise / 100 }
            : item
    );

    if (!saveAccounts()) {
        accounts = previousAccounts;
        return;
    }

    renderAccounts();

    alert(
        `${action === "deposit" ? "Deposit" : "Withdrawal"} successful!\n` +
        `New balance: ${formatMoney(newBalanceInPaise / 100)}`
    );
}

// Cancel edit and reset the form
function resetForm() {
    form.reset();
    editIdInput.value = "";

    document.getElementById("formTitle").textContent =
        "Create Bank Account";

    document.getElementById("submitBtn").textContent =
        "Create Account";

    balanceField.hidden = false;
    balanceInput.required = true;
    balanceInput.value = "0";

    document.getElementById("accountType").value = "Savings";
}

document.getElementById("cancelBtn").addEventListener("click", resetForm);

document.getElementById("submitBtn").addEventListener("click", function() {
    // The form submit event handles validation and saving.
});

searchInput.addEventListener("input", renderAccounts);

// Initial display
renderAccounts();
