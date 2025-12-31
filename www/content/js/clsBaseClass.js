const baseClassMap = {}; //Key value map of classes ex:// baseClassMap["baseClass"] = baseClass;
class clsBaseClass
{
    /**
     * Class constructor
     * @constructor
     */
    constructor(instanceName)
    {
        /** Debug flag set here will be set by all classes that inherit it */
        this._debug = true;

        this._instanceName = instanceName || null;
    }

    /**
     * Returns current instance class name
     * @return {*}
     */
    className()
    {
        return this.constructor.name;
    }

    //Requires class be added to baseClassMap
    classDef()
    {
        if(typeof baseClassMap[this.className()] !== 'undefined')
        {
            return baseClassMap[this.className()];
        }
        else
        {
            return null;
        }
    }

    clone()
    {
        let origClass = this.classDef();

        if(origClass)
        {
            let clonedClassInstance = Object.assign(new origClass, this);

            return clonedClassInstance;
        }
        else //Backup method for unmapped classes
        {
            let clonedClassInstance = {};

            let methods = this.methods();

            methods.forEach((method) => 
            {
                clonedClassInstance[method] = this[method];
            });

            let keys = Object.keys(this);
            keys.forEach((key) =>
            {
                clonedClassInstance[key] = this[key];
            });

            return clonedClassInstance;
        }
    }

    castFrom(obj)
    {
        let keys = Object.keys(obj);

        keys.forEach((key) =>
        {
            this[key] = obj[key];
        });
    }

    /**
     * Returns current class instance name
     * @return {*}
     */
     classInstanceName()
     {
        return this._instanceName;
     }

    /**
     * Returns current instance class method names
     * @return {*}
     */
    methods()
    {
        let arr = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
        arr = arr.filter(prop => typeof this[prop] === 'function'); //Remove functions/methods
        return arr
    }

    /**
     * Returns current instance class property names
     * @return {*}
     */
    properties()
    {
        let arr = Object.getOwnPropertyNames(this);
        arr = arr.concat(Object.getOwnPropertyNames(Object.getPrototypeOf(this)));
        arr = arr.filter(prop => typeof this[prop] != 'function'); //Remove functions/methods
        return arr;
    }

    /**
     * Nulls all properties in class excluding meta
     * ToDo handle _ other than position 0 for properties indexOf('_')
     */
    deletePropertyValues()
    {
        this.properties().forEach((prop) =>
        {
            if(prop.indexOf('_') <= -1)
            {
                this[prop] = null;
            }
        })
    }

    //Remove keys / meta that are needed when passing to API
    removeInternalProperties()
    {
        let keys = this.properties();
        keys.forEach((key) =>
        {
            if(key.indexOf('_') > -1 || key.indexOf('#') > -1 )
            {
                delete this[key];
            }
        });
    }

    randomNumber(min, max)
    {
        return Math.floor(Math.random() * (max - min) ) + min;
    }

    randomLetter()
    {
        let letters =  'abcdefghijklmnopqrstuvwxyz'.split('');
        let num = Math.floor(Math.random() * letters.length);
        return letters[num];
    }

    randomID()
    {
        let datetime = Date.now();
        return 'kbc-' + this.randomLetter() + this.randomNumber(100, 900) + '-' + datetime;
    }
}
baseClassMap["clsBaseClass"] = clsBaseClass;