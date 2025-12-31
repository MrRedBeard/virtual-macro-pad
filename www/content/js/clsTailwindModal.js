/**
 * clsTailwindModal.js
 *
 * Subclass of clsTailwindComponent that builds a centered modal dialog.
 * Inherits from clsTailwindComponent, so clsTailwindComponent must be loaded first.
 **/
class clsTailwindModal extends clsTailwindComponent
{
    /**
     * @param {Object} [options={}]
     * @param {HTMLElement} [options.containerEl]  Use this existing element as the modal root.
     * @param {string}      [options.title]        The modal’s title text.
     * @param {string|HTMLElement} [options.body]  The modal’s body (either raw HTML string or HTMLElement).
     * @param {string} [this.options.size] Size of modal defaults as md - sm md lg xl
     * @param {string}     [options.CancelText]     Cancel Button Text
     * @param {string}     [options.DoneText]       Done Button Text
     * @param {boolean}    [options.CancelButton]     Show Cancel Button
     * @param {boolean}    [options.DoneButton]       Show Done Button
     * @param {Function}    [options.onCancel]     Callback when “Cancel” is clicked.
     * @param {Function}    [options.onDone]       Callback when “Done” is clicked.
     */
    constructor(options = {})
    {
        super(options);
        this.options = options;

        if(typeof this.options.ClickOffClosed === 'undefined')
        {
            this.options.ClickOffClosed = false;
        }
        if(typeof this.options.CloseButton === 'undefined')
        {
            this.options.CloseButton = false;
        }
        if(typeof this.options.CancelButton === 'undefined')
        {
            this.options.CancelButton = true;
        }
        if(typeof this.options.DoneButton === 'undefined')
        {
            this.options.DoneButton = true;
        }
        if(typeof this.options.CancelText === 'undefined')
        {
            this.options.CancelText = 'Cancel';
        }
        if(typeof this.options.DoneText === 'undefined')
        {
            this.options.DoneText = 'Done';
        }

        if(typeof this.options.size === 'undefined')
        {
            //sm md lg xl
            this.options.size = 'md';
        }

        this.init();
    }

    init()
    {
        this.addClass('modal');
        this.setAttr('role', 'dialog');
        this.setAttr('aria-modal', 'true');
        this.setAttr('aria-labelledby', 'modalTitle');

        // <div class="wrapper">
        const wrapper = document.createElement('div');
        wrapper.classList.add('wrapper');
        switch(this.options.size)
        {
            case 'sm':
                wrapper.classList.add('modal-sm');
                break;
            case 'md':
                wrapper.classList.add('modal-md');
                break;
            case 'lg':
                wrapper.classList.add('modal-lg');
                break;
            case 'xl':
                wrapper.classList.add('modal-xl');
                break;
            case 'fs':
                wrapper.classList.add('modal-fs');
                break;
        }
        wrapper.addEventListener('click', (e) =>
        {
            e.stopPropagation();
        });

        if(this.options.ClickOffClosed)
        {
            this.element.addEventListener('click', () =>
            {
                if (typeof this.options.onCancel === 'function')
                {
                    this.options.onCancel();
                }
                this.dismiss();
            });
        }

        if(this.options.CloseButton)
        {
            const closeButton = document.createElement('div');
            closeButton.classList.add('close-button');
            let i = document.createElement('i');
            i.classList.add('kfi-close');
            closeButton.append(i);
            closeButton.addEventListener('click', () =>
            {
                if (typeof this.options.onCancel === 'function')
                {
                    this.options.onCancel();
                }
                this.dismiss();
            });
            wrapper.appendChild(closeButton);
        }

        // 3a) Title: <h2 id="modalTitle" class="title">…</h2>
        if (this.options.title !== undefined)
        {
            const h2 = document.createElement('h2');
            h2.classList.add('title');
            h2.textContent = this.options.title;
            wrapper.appendChild(h2);
        }

        // 3b) Body: <div class="body">…</div>
        const bodyDiv = document.createElement('div');
        bodyDiv.classList.add('body', 'no-verticle-scrollbar');

        if (this.options.body instanceof HTMLElement)
        {
            // If they passed an HTMLElement, append it directly
            bodyDiv.appendChild(this.options.body);
        }
        else if (typeof this.options.body === 'string')
        {
            // Otherwise assume it’s raw HTML; set via innerHTML
            bodyDiv.innerHTML = this.options.body;
        }
        wrapper.appendChild(bodyDiv);

        // 3c) Footer: <div class="footer"> <button class="button-cancel">Cancel</button> <button class="button-done">Done</button> </div>
        const footerDiv = document.createElement('div');
        footerDiv.classList.add('footer');

        // Cancel button
        if(this.options.CancelButton)
        {
            const btnCancel = document.createElement('button');
            btnCancel.setAttribute('type', 'button');
            btnCancel.classList.add('button-cancel');
            btnCancel.textContent = this.options.CancelText;
            btnCancel.addEventListener('click', () => 
            {
                if (typeof this.options.onCancel === 'function')
                {
                    this.options.onCancel();
                }
                this.dismiss();
            });
            footerDiv.appendChild(btnCancel);
        }

        // Done button
        if(this.options.DoneButton)
        {
            const btnDone = document.createElement('button');
            btnDone.setAttribute('type', 'button');
            btnDone.classList.add('button-done');
            btnDone.textContent = this.options.DoneText;
            btnDone.addEventListener('click', () =>
            {
                if (typeof this.options.onDone === 'function') 
                {
                    this.options.onDone();
                }
                this.dismiss();
            });
            footerDiv.appendChild(btnDone);
        }

        wrapper.appendChild(footerDiv);

        // 3d) Attach wrapper into this.element
        this.element.appendChild(wrapper);

        //Add to body if no container is defined
        if(this.options.containerEl === 'undefined' || !this.options.containerEl)
        {
            document.querySelector('body').prepend(this.element);
        }
    }

    /**
     * Remove this.element (the entire modal) from the DOM.
     */
    dismiss()
    {
        if (this.element.parentNode) 
        {
            this.element.parentNode.removeChild(this.element);
        }
    }
}