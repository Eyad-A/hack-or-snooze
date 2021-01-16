$(async function() {
  // cache some selectors we'll be using quite a bit
  const $body = $("body");
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $favoritedStories = $("#favorited-articles");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");
  const $userProfile = $("#user-profiles");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /** 
   *  submit article event handler 
   * 
   */

  $submitForm.on("click", async function(evt) {
    evt.preventDefault();

    // get all the info from the form
    const author = $("#author").val();
    const title = $("#title").val();
    const url = $("#url").val();
    const hostName = getHostName(url);
    const username = currentUser.username;

    const storyObject = await storyList.addStory(currentUser, {
      title,
      author,
      url,
      username 
    });

    //generate HTML for the new story 
    const $li = $(`
      <li id="${storyObject.storyId}" class="id-${storyObject.storyId}">
        <span class="star">
          <i class="far fa-star"></i>
        </span>
        <a class="article-link" href="${url}" target="a_blank">
          <strong>${title}</strong>
        </a>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-author">by ${author}</small>
        <small class="article-username">posted by ${username}</small>
      </li>
    `);
    $allStoriesList.prepend($li);

    // hide form
    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");
  });

  /**
   * adding favorites event handler 
   * 
   */

   $(".articles-container").on("click", ".star", async function(evt) {
     if (currentUser) {
       const $target = $(evt.target);
       const $closestLi = $target.closest("li");
       const storyId = $closestLi.attr("id");

       // if already favorited 
       if ($target.hasClass("fas")) {
         //remove favorite 
         await currentUser.removeFavorite(storyId);
         // change to empty star 
         $target.closest("i").toggleClass("fas far ");
       } else {
         // if the item is not a favorite 
         await currentUser.addFavorite(storyId);
         $target.closest("i").toggleClass("fas far");
       }
     }
   });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * profile event handler 
   */

  $navUserProfile.on("click", function() {
    // hide 
    hideElements();
    // show user profile 
    $userProfile.show();
  });

  /** 
   * navigation submit event handler 
   */

   $navSubmit.on("click", function() {
     if (currentUser) {
       hideElements();
       $allStoriesList.show();
       $submitForm.slideToggle();
     }
   });

   /**
    * favorites nav event handler 
    */

    $body.on("click", "#nav-favorites", function() {
      hideElements();
      if (currentUser) {
        generateFaves();
        $favoritedStories.show();
      }
    });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * My Stories nav event handler 
   */

   $body.on("click", "#nav-my-stories", function() {
     hideElements();
     if (currentUser) {
       $userProfile.hide();
       generateMyStories();
       $ownStories.show();
     }
   });

   /**
    * delete a story event handler 
    */

    $ownStories.on("click", ".trash-can", async function(evt) {
      // get story ID 
      const $closestLi = $(evt.target).closest("li");
      const storyId = $closestLi.attr("id");

      // send an API request to remove the stort 
      await storyList.removeStory(currentUser, storyId);

      // get new story list 
      await generateStories();

      //hide everything 
      hideElements();

      //show story list 
      $allStoriesList.show();
    });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story, isOwnStory) {
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? "fas" : "far";

    // render a trash can 
    const trashCanIcon = isOwnStory ? `<span class="trash-can"><i class="fas fa-trash-alt"></i></span>` : "";

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        ${trashCanIcon}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /**
   * build the favorites list 
   */

   function generateFaves() {
     // empty the list 
     $favoritedStories.empty();

     // if user has no favorites 
     if (currentUser.favorites.length === 0) {
       $favoritedStories.append("<p>No favorites added</p>");
     } else {
       // for each user's favorite story 
       for (let story of currentUser.favorites) {
         // render each story 
         let favoriteHTML = generateStoryHTML(story, false, true);
         $favoritedStories.append(favoriteHTML);
       }
     }
   }

   function generateMyStories() {
     $ownStories.empty();

     // if user has no stories 
     if (currentUser.ownStories.length === 0) {
       $ownStories.append("<p>No stories added</p>");
     } else {
       // for each of the user's stories 
       for (let story of currentUser.ownStories) {
         // render each story 
         let ownStoryHTML = generateStoryHTML(story, true);
         $ownStories.append(ownStoryHTML);
       }
     }

     $ownStories.show();
   }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $userProfile,
      $favoritedStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navWelcome.show();
    $(".main-nav-links, #user-profile").toggleClass("hidden");
  }

  // check if story is a favorite 

  function isFavorite(story) {
    let favStoryIds = new Set();
    if (currentUser) {
      favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
    }
    return favStoryIds.has(story.storyId);
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
