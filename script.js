// =============================================
// Meals App - TheMealDB API
// =============================================

const API = "https://www.themealdb.com/api/json/v1/1/";

// DOM elements
const categoriesContainer = document.getElementById("categoriesContainer");
const areaContainer = document.getElementById("areaContainer");
const mealsContainer = document.getElementById("mealsContainer");

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const letterForm = document.getElementById("letterForm");
const letterInput = document.getElementById("letterInput");
const ingredientForm = document.getElementById("ingredientForm");
const ingredientInput = document.getElementById("ingredientInput");
const randomBtn = document.getElementById("randomBtn");

const mealsTitle = document.getElementById("mealsTitle");
const mealsSubtitle = document.getElementById("mealsSubtitle");

let lastMeals = [];
let currentRequest = 0;

// Escape text before inserting API-provided values into HTML.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// Only allow normal HTTP/HTTPS URLs in links and images.
function safeURL(value) {
    if (!value) return "";

    try {
        const url = new URL(value);
        if (url.protocol === "https:" || url.protocol === "http:") {
            return escapeHTML(url.href);
        }
    } catch (error) {
        console.warn("Invalid URL:", value);
    }

    return "";
}

// Fetch data from TheMealDB.
async function getData(url, loadingContainer = mealsContainer) {
    const requestNumber = ++currentRequest;

    if (loadingContainer) {
        loadingContainer.innerHTML = '<p class="loading-message">Loading...</p>';
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Request failed (${response.status})`);
        }

        return await response.json();
    } catch (error) {
        console.error("TheMealDB API error:", error);

        // Do not let an older request overwrite a newer result.
        if (loadingContainer && requestNumber === currentRequest) {
            loadingContainer.innerHTML = `
                <p class="error-message">
                    Could not load data. Check your internet connection and try again.
                </p>
            `;
        }

        return null;
    }
}

// Update the meals section heading.
function updateMealsHeading(title, subtitle = "") {
    mealsTitle.textContent = title;
    mealsSubtitle.textContent = subtitle;
    document.getElementById("meals").scrollIntoView({ behavior: "smooth", block: "start" });
}

// =============================================
// Categories
// =============================================

async function getCategories() {
    const data = await getData(API + "categories.php", categoriesContainer);

    if (data && Array.isArray(data.categories)) {
        displayCategories(data.categories);
    } else if (data) {
        categoriesContainer.innerHTML = '<p class="error-message">No categories found.</p>';
    }
}

function displayCategories(categories) {
    if (!categories || categories.length === 0) {
        categoriesContainer.innerHTML = '<p class="error-message">No categories found.</p>';
        return;
    }

    categoriesContainer.innerHTML = categories.map(category => `
        <article class="category-card"
                 data-category="${escapeHTML(category.strCategory)}"
                 tabindex="0"
                 role="button"
                 aria-label="Show ${escapeHTML(category.strCategory)} meals">
            <img src="${safeURL(category.strCategoryThumb)}"
                 alt="${escapeHTML(category.strCategory)}"
                 loading="lazy">
            <h3>${escapeHTML(category.strCategory)}</h3>
        </article>
    `).join("");
}

// =============================================
// Areas / cuisines
// =============================================

async function getArea() {
    const data = await getData(API + "list.php?a=list", areaContainer);

    if (data && Array.isArray(data.meals)) {
        displayArea(data.meals);
    } else if (data) {
        areaContainer.innerHTML = '<p class="error-message">No cuisines found.</p>';
    }
}

function displayArea(areas) {
    if (!areas || areas.length === 0) {
        areaContainer.innerHTML = '<p class="error-message">No cuisines found.</p>';
        return;
    }

    areaContainer.innerHTML = areas.map(area => `
        <button class="area-card"
                type="button"
                data-area="${escapeHTML(area.strArea)}">
            <span class="area-icon" aria-hidden="true">🌍</span>
            <h3>${escapeHTML(area.strArea)}</h3>
        </button>
    `).join("");
}

// =============================================
// Meals list
// =============================================

async function getMealsByCategory(category) {
    updateMealsHeading(`${category} Meals`, `Meals from the ${category} category.`);
    const data = await getData(API + "filter.php?c=" + encodeURIComponent(category));

    if (data) displayMeals(data.meals);
}

async function getMealsByArea(area) {
    updateMealsHeading(`${area} Meals`, `Popular meals from ${area} cuisine.`);
    const data = await getData(API + "filter.php?a=" + encodeURIComponent(area));

    if (data) displayMeals(data.meals);
}

async function getMealsByIngredient(ingredient) {
    if (!ingredient) {
        mealsContainer.innerHTML = '<p class="error-message">Please enter an ingredient.</p>';
        return;
    }

    updateMealsHeading(`Meals with ${ingredient}`, `Recipes containing ${ingredient}.`);
    const data = await getData(API + "filter.php?i=" + encodeURIComponent(ingredient));

    if (data) displayMeals(data.meals);
}

function displayMeals(meals) {
    if (!Array.isArray(meals) || meals.length === 0) {
        lastMeals = [];
        mealsContainer.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon" aria-hidden="true">🔎</span>
                <h3>No meals found</h3>
                <p>Try another search or choose a different category.</p>
            </div>
        `;
        return;
    }

    lastMeals = meals;

    mealsContainer.innerHTML = meals.map(meal => `
        <article class="meal-card"
                 data-meal-id="${escapeHTML(meal.idMeal)}"
                 tabindex="0"
                 role="button"
                 aria-label="View ${escapeHTML(meal.strMeal)} details">
            <img src="${safeURL(meal.strMealThumb)}"
                 alt="${escapeHTML(meal.strMeal)}"
                 loading="lazy">
            <div class="meal-info">
                <h3>${escapeHTML(meal.strMeal)}</h3>
            </div>
        </article>
    `).join("");
}

// =============================================
// Meal details
// =============================================

async function getMealDetails(id) {
    const data = await getData(API + "lookup.php?i=" + encodeURIComponent(id));

    if (data && Array.isArray(data.meals) && data.meals.length > 0) {
        displayMealDetails(data.meals[0]);
    } else if (data) {
        mealsContainer.innerHTML = '<p class="error-message">Meal details were not found.</p>';
    }
}

function displayMealDetails(meal) {
    let ingredientsHTML = "";

    for (let index = 1; index <= 20; index++) {
        const ingredient = meal[`strIngredient${index}`]?.trim();
        const measure = meal[`strMeasure${index}`]?.trim();

        if (ingredient) {
            ingredientsHTML += `
                <li>
                    <span>${escapeHTML(measure || "To taste")}</span>
                    ${escapeHTML(ingredient)}
                </li>
            `;
        }
    }

    const sourceURL = safeURL(meal.strSource);
    const youtubeURL = safeURL(meal.strYoutube);

    mealsContainer.innerHTML = `
        <article class="meal-details">
            <button class="back-button" id="backBtn" type="button">
                ← Back to meals
            </button>

            <div class="details-top">
                <img class="details-image"
                     src="${safeURL(meal.strMealThumb)}"
                     alt="${escapeHTML(meal.strMeal)}">

                <div class="details-info">
                    <h2>${escapeHTML(meal.strMeal)}</h2>

                    <div class="details-meta">
                        <span>Category: ${escapeHTML(meal.strCategory || "N/A")}</span>
                        <span>Area: ${escapeHTML(meal.strArea || "N/A")}</span>
                    </div>

                    <h3>Ingredients</h3>
                    <ul class="ingredients-list">
                        ${ingredientsHTML || "<li>Ingredients unavailable</li>"}
                    </ul>
                </div>
            </div>

            <div class="instructions">
                <h3>Instructions</h3>
                <p>${escapeHTML(meal.strInstructions || "Instructions unavailable.")}</p>
            </div>

            <div class="details-links">
                ${sourceURL ? `<a href="${sourceURL}" target="_blank" rel="noopener noreferrer">Recipe source ↗</a>` : ""}
                ${youtubeURL ? `<a href="${youtubeURL}" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>` : ""}
            </div>
        </article>
    `;

    document.getElementById("backBtn").addEventListener("click", () => {
        displayMeals(lastMeals);
        mealsTitle.textContent = "Discover meals";
        mealsSubtitle.textContent = "Select a meal to see its details.";
    });
}

// =============================================
// Search
// =============================================

async function searchByName(name) {
    if (!name) {
        mealsContainer.innerHTML = `
            <div class="empty-state">
                <h3>Type a meal name first</h3>
                <p>For example: chicken, pasta, or pizza.</p>
            </div>
        `;
        return;
    }

    updateMealsHeading(`Search: ${name}`, `Search results for "${name}".`);
    const data = await getData(API + "search.php?s=" + encodeURIComponent(name));

    if (data) displayMeals(data.meals);
}

async function searchByLetter(letter) {
    if (!/^[a-z]$/i.test(letter)) return;

    updateMealsHeading(`Meals starting with "${letter.toUpperCase()}"`);
    const data = await getData(API + "search.php?f=" + encodeURIComponent(letter));

    if (data) displayMeals(data.meals);
}

// =============================================
// Random meal
// =============================================

async function getRandomMeal() {
    updateMealsHeading("Random meal", "Here's a surprise recipe for you.");
    const data = await getData(API + "random.php");

    if (data && Array.isArray(data.meals) && data.meals.length > 0) {
        // Keep the random meal as the back destination.
        lastMeals = data.meals;
        displayMealDetails(data.meals[0]);
    }
}

// =============================================
// Optional ingredients list helper
// =============================================

async function getIngredients() {
    const data = await getData(API + "list.php?i=list", null);

    if (data && Array.isArray(data.meals)) {
        console.log("Available ingredients:", data.meals);
        return data.meals;
    }

    return [];
}

// =============================================
// Events - event delegation for dynamic cards
// =============================================

categoriesContainer.addEventListener("click", event => {
    const card = event.target.closest(".category-card");
    if (!card || !categoriesContainer.contains(card)) return;

    getMealsByCategory(card.dataset.category);
});

categoriesContainer.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const card = event.target.closest(".category-card");
    if (!card) return;

    event.preventDefault();
    getMealsByCategory(card.dataset.category);
});

areaContainer.addEventListener("click", event => {
    const card = event.target.closest(".area-card");
    if (!card || !areaContainer.contains(card)) return;

    getMealsByArea(card.dataset.area);
});

mealsContainer.addEventListener("click", event => {
    const card = event.target.closest(".meal-card");
    if (!card || !mealsContainer.contains(card)) return;

    getMealDetails(card.dataset.mealId);
});

mealsContainer.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const card = event.target.closest(".meal-card");
    if (!card) return;

    event.preventDefault();
    getMealDetails(card.dataset.mealId);
});

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchByName(searchInput.value.trim());
});

letterForm.addEventListener("submit", event => {
    event.preventDefault();
    searchByLetter(letterInput.value.trim().charAt(0));
});

ingredientForm.addEventListener("submit", event => {
    event.preventDefault();
    getMealsByIngredient(ingredientInput.value.trim());
});

randomBtn.addEventListener("click", getRandomMeal);

// =============================================
// Start the app
// =============================================

getCategories();
getArea();
