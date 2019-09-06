/**
 * make a fetch call to the server
 * @param  {String}   fetchURL      fetch URL
 * @param  {Object}   options  fetch options
 */
function callServer(fetchURL = '/api', options = {}) {
    return new Promise((resolve, reject) => {
        let type = 'json';
        if (options.responseType) {
            type = options.responseType;
            delete options.responseType;
        }

        if (options.body && (!options.method || options.method.toLowerCase() == 'get')) {
            options.method = 'post';
        }

        let showSpinner = true;
        if (options.spinner && options.spinner === false) {
            showSpinner = false;
            delete options.spinner;
        }

        const fetchOptions = {
            credentials: 'same-origin',
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
        };

        Object.assign(fetchOptions, options);

        if (showSpinner) waitSpinner();
        fetch(fetchURL, fetchOptions)
        .then(res => {
            switch (type) {
                case 'json':
                    return res.json();

                case 'text':
                case 'html':
                    return res.text();
            }
        })
        .then(data => {
            if (type === "json" && data.error) {
                throw data.error;
            }
            resolve(data);
        })
        .catch(reject)
        .finally(() => {
            waitSpinner(false);
        });
    });
}

/**
 * Toggles the spinner
 * @param {Boolean} show 
 */
function waitSpinner(show = true) {
    if (show) {
        $("#spinner").css({display: "flex"});
    } else {
        $("#spinner").css({display: "none"});
    }
}