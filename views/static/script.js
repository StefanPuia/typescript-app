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

        if (options.body && typeof options.body === "object") {
            options.body = JSON.stringify(options.body);
        }

        let showSpinner = true;
        if (options.spinner !== undefined && options.spinner === false) {
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
            return res.text();
        })
        .then(data => {
            switch (type) {
                case 'json':
                    try {
                        let json = JSON.parse(data);
                        if (json.error) {
                            throw json.error;
                        }
                        resolve(json);
                    } catch(err) {
                        console.warn(data);
                        throw err;
                    }
                    break;

                case 'text':
                case 'html':
                    resolve(data);
                    break;
            }
            resolve(data);
        })
        .catch(err => {
            if (typeof err === "object") {
                reject(JSON.stringify(err));
            } else if (typeof err === "string") {
                reject(err);
            } else {
                reject(err.toString());
            }
        })
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