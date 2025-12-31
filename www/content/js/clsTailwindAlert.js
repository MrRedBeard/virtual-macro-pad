/**
 * clsTailwindAlert.js
 **/
class clsTailwindAlert extends clsTailwindComponent
{
    /**
     * @param {Object} [options={}]
     * @param {HTMLElement} [options.containerEl]   If provided, use this existing <div> as the alert root.
     * @param {"success"|"warning"|"error"|"info"} [options.type="success"]
     *   Chooses the icon color. (We’ll just change the text‐color class on the icon <i>.)
     * @param {string} [options.title]    Bold heading text.
     * @param {string} [options.message]  Body paragraph text.
     */
    constructor(options = {})
    {
        super(options);


        if(typeof this.options.type === 'undefined' || !this.options.type)
        {
            // default = success
            this.options.type = 'success';
        }
        
        this.init();
    }

    init()
    {
        this.addClass('alert');
        this.setAttr('role', 'alert');

        // inner structure:
        const wrapper = document.createElement('div');
        wrapper.classList.add('wrapper');

        // Choose color class by `type`
        // colors commonly used for success, warning, error, info
        const t = this.options.type;
        let colorClass = 'success'; // default = success
        if (t === 'warning') colorClass = 'warning';
        else if (t === 'error') colorClass = 'error';
        else if (t === 'info') colorClass = 'info';

        this.element.classList.add(colorClass)

        let iconBlock = document.createElement('div');
        iconBlock.classList.add('icon-block');
        let icon = document.createElement('i');
        icon.classList.add('icon');
        let msgIcon = '';
        if (t === 'success') msgIcon = 'kfi-info-circle';
        else if (t === 'warning') msgIcon = 'kfi-alert-circle';
        else if (t === 'error') msgIcon = 'kfi-alert-triangle';
        else if (t === 'info') msgIcon = 'kfi-info-circle';
        icon.classList.add(msgIcon);
        iconBlock.append(icon);
        wrapper.append(iconBlock);

        // Text container
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('content');
        if (typeof this.options.title === 'string') {
            const strong = document.createElement('strong');
            strong.classList.add('title');
            strong.textContent = this.options.title;
            contentDiv.appendChild(strong);
        }
        if (typeof this.options.message === 'string') {
            const p = document.createElement('p');
            p.classList.add('message');
            p.textContent = this.options.message;
            contentDiv.appendChild(p);
        }
        wrapper.append(contentDiv);

        // 3c) Dismiss button (the “X”)
        const btn = document.createElement('button');
        btn.setAttribute('type', 'button');
        btn.setAttribute('aria-label', 'Dismiss alert');
        btn.classList.add('dismiss');
        const srSpan = document.createElement('span');
        srSpan.classList.add('srSpan');
        srSpan.textContent = 'Dismiss popup';
        btn.appendChild(srSpan);
        const close = document.createElement('i');
        close.classList.add('close', 'kfi-close');
        btn.appendChild(close);
        btn.addEventListener('click', () => this.dismiss());
        wrapper.appendChild(btn);

        this.element.appendChild(wrapper)
        
        //Add to body if no container is defined
        if(this.options.containerEl === 'undefined' || !this.options.containerEl)
        {
            document.querySelector('body').append(this.element);
        }
    }

    /**
     * Remove this.element from the DOM.
     */
    dismiss()
    {
        if (this.element.parentNode)
        {
            this.element.parentNode.removeChild(this.element);
        }
    }
}