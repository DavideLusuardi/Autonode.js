

/**
 * Observer callback function
 * @callback observer
 * @param {*} value         value changed 
 * @param {*} key           key whose value changed
 * @param {*} observable    observable object
 */



/**
 * Observable
 * @class Observable
 */
class Observable {
    #values;
    #observers;
    #genericObservers;
    #id=0;

    /**
     * @constructor Observable
     * @param {*} init 
     */
    constructor (init={}) {
        this.#values = {}
        this.#observers = {}
        this.#genericObservers = []
        for (let [key,value] of Object.entries(init)) {
            this.set (key, value);
        }
    }
    
    /**
     * 
     * @param {*} key
     */
    defineProperty (key) {

        if (!(key in this.#observers)) {
            this.#observers[key] = {}
        }

        if (!(this.hasOwnProperty(key))) {
            this[key] = {}
            Object.defineProperty (this, key, {
                get: () => this.#values[key],
                set: (v) => {
                    this.#values[key] = v;
                    Promise.resolve().then( () => {
                        for (let obs of this.#genericObservers)
                            obs(v, key, this);
                        for (let obs of Object.values(this.#observers[key]))
                            obs(v, key, this);
                    }).catch( err => console.error(err) )
                }
            })
        }

    }
    
    /**
     * 
     * @param {*} key 
     * @param {*} value 
     * @returns true if changed, false otherwise
     */
    set (key, value) {
        this.defineProperty (key)
        if ( this[key] != value ) {
            this[key] = value; // use earlier defined setter and call observers
            return true
        }
        else
            return false
    }

    /**
     * @return {Array}    Return an array of [key, value] to iterate over
     */
    get entries () {
        return Object.entries(this.#values);
    }

    /**
     * 
     * @param {observer} observer function(value, key, observable)
     */
    observeAny (observer) {
        this.#genericObservers.push( observer )
    }
    
    /**
     * 
     * @param {*} key 
     * @param {observer} observer function(value, key, observable)
     */
    observe (key, observer) {
        observer.__id = ++this.#id
        this.defineProperty(key)
        this.#observers[key][observer.__id] = observer
    }

    /**
     * 
     * @param {*} key 
     * @param {observer} observer function(value, key, observable)
     */
    unobserve (key, observer) {
        if (key in this.#observers)
            delete this.#observers[key][observer.__id]
    }

    /**
     * 
     * @param {*} key
     * @returns {Promise} Promise that resolves when observed value changes
     */
    async notifyChange (key) {
        return new Promise( res => {
            var tmpObs = (value, key, observer) => {
                this.unobserve(key, tmpObs)
                res(value)
            }
            this.observe(key, tmpObs)
        })
    }

    
    /**
     * 
     * @returns {Promise} Promise that resolves when any among the observed values changes
     */
     async notifyAnyChange () {
        return new Promise( res => {
            var tmpObs = (value, key, observer) => {
                res(value)
            }
            this.observeAny(tmpObs)
        })
    }

}



module.exports = Observable