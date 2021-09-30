
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Heading.svelte generated by Svelte v3.43.0 */

    const file$2 = "src/Heading.svelte";

    function create_fragment$2(ctx) {
    	let h1;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text("Solution: ");
    			t1 = text(/*name*/ ctx[0]);
    			add_location(h1, file$2, 4, 0, 41);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Heading', slots, []);
    	let { name } = $$props;
    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Heading> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ name });

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(0, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name];
    }

    class Heading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { name: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Heading",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !('name' in props)) {
    			console.warn("<Heading> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<Heading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Heading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Solution.svelte generated by Svelte v3.43.0 */
    const file$1 = "src/Solution.svelte";

    function create_fragment$1(ctx) {
    	let heading;
    	let t0;
    	let h10;
    	let t1;
    	let span;
    	let t2;
    	let span_class_value;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let input0;
    	let t8;
    	let br;
    	let t9;
    	let input1;
    	let t10;
    	let h11;
    	let t11;
    	let t12;
    	let input2;
    	let current;
    	let mounted;
    	let dispose;

    	heading = new Heading({
    			props: { name: /*name*/ ctx[5] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(heading.$$.fragment);
    			t0 = space();
    			h10 = element("h1");
    			t1 = text("I want to learn ");
    			span = element("span");
    			t2 = text(/*lang*/ ctx[2]);
    			t3 = text(" in ");
    			t4 = text(/*days*/ ctx[1]);
    			t5 = text(" days");
    			t6 = text(/*mark*/ ctx[3]);
    			t7 = text("\n\nInput what to learn:");
    			input0 = element("input");
    			t8 = space();
    			br = element("br");
    			t9 = text("\nInput days to learn: ");
    			input1 = element("input");
    			t10 = space();
    			h11 = element("h1");
    			t11 = text(/*text*/ ctx[0]);
    			t12 = space();
    			input2 = element("input");
    			attr_dev(span, "class", span_class_value = "" + (null_to_empty(/*colored*/ ctx[4] === false ? '' : 'colored') + " svelte-1irvp5q"));
    			add_location(span, file$1, 27, 20, 463);
    			add_location(h10, file$1, 27, 0, 443);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file$1, 29, 20, 573);
    			add_location(br, file$1, 30, 0, 613);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$1, 31, 21, 641);
    			add_location(h11, file$1, 33, 0, 682);
    			attr_dev(input2, "type", "text");
    			add_location(input2, file$1, 35, 0, 699);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(heading, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h10, anchor);
    			append_dev(h10, t1);
    			append_dev(h10, span);
    			append_dev(span, t2);
    			append_dev(h10, t3);
    			append_dev(h10, t4);
    			append_dev(h10, t5);
    			append_dev(h10, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, input0, anchor);
    			set_input_value(input0, /*lang*/ ctx[2]);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, input1, anchor);
    			set_input_value(input1, /*days*/ ctx[1]);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, h11, anchor);
    			append_dev(h11, t11);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, input2, anchor);
    			set_input_value(input2, /*text*/ ctx[0]);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[7]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[8]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const heading_changes = {};
    			if (dirty & /*name*/ 32) heading_changes.name = /*name*/ ctx[5];
    			heading.$set(heading_changes);
    			if (!current || dirty & /*lang*/ 4) set_data_dev(t2, /*lang*/ ctx[2]);

    			if (!current || dirty & /*colored*/ 16 && span_class_value !== (span_class_value = "" + (null_to_empty(/*colored*/ ctx[4] === false ? '' : 'colored') + " svelte-1irvp5q"))) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (!current || dirty & /*days*/ 2) set_data_dev(t4, /*days*/ ctx[1]);
    			if (!current || dirty & /*mark*/ 8) set_data_dev(t6, /*mark*/ ctx[3]);

    			if (dirty & /*lang*/ 4 && input0.value !== /*lang*/ ctx[2]) {
    				set_input_value(input0, /*lang*/ ctx[2]);
    			}

    			if (dirty & /*days*/ 2 && input1.value !== /*days*/ ctx[1]) {
    				set_input_value(input1, /*days*/ ctx[1]);
    			}

    			if (!current || dirty & /*text*/ 1) set_data_dev(t11, /*text*/ ctx[0]);

    			if (dirty & /*text*/ 1 && input2.value !== /*text*/ ctx[0]) {
    				set_input_value(input2, /*text*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(heading.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(heading.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(heading, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h10);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(input1);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(h11);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(input2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let name;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Solution', slots, []);
    	let days = 2;
    	let lang = "Svelte";
    	let { em } = $$props;
    	let mark = "";
    	let { text = "" } = $$props;
    	let colored = false;
    	let char = "!";

    	if (em == null || em == "" || em == false) {
    		mark = "";
    	} else if (em == "!" || em == true) {
    		mark = "!";
    	}

    	const writable_props = ['em', 'text'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Solution> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		lang = this.value;
    		$$invalidate(2, lang);
    	}

    	function input1_input_handler() {
    		days = this.value;
    		$$invalidate(1, days);
    	}

    	function input2_input_handler() {
    		text = this.value;
    		$$invalidate(0, text);
    	}

    	$$self.$$set = $$props => {
    		if ('em' in $$props) $$invalidate(6, em = $$props.em);
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    	};

    	$$self.$capture_state = () => ({
    		Heading,
    		days,
    		lang,
    		em,
    		mark,
    		text,
    		colored,
    		char,
    		name
    	});

    	$$self.$inject_state = $$props => {
    		if ('days' in $$props) $$invalidate(1, days = $$props.days);
    		if ('lang' in $$props) $$invalidate(2, lang = $$props.lang);
    		if ('em' in $$props) $$invalidate(6, em = $$props.em);
    		if ('mark' in $$props) $$invalidate(3, mark = $$props.mark);
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    		if ('colored' in $$props) $$invalidate(4, colored = $$props.colored);
    		if ('char' in $$props) $$invalidate(10, char = $$props.char);
    		if ('name' in $$props) $$invalidate(5, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*text*/ 1) {
    			$$invalidate(5, name = text);
    		}

    		if ($$self.$$.dirty & /*text*/ 1) {
    			if (text.includes(char)) {
    				$$invalidate(4, colored = true);
    			} else {
    				$$invalidate(4, colored = false);
    			}
    		}
    	};

    	return [
    		text,
    		days,
    		lang,
    		mark,
    		colored,
    		name,
    		em,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler
    	];
    }

    class Solution extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { em: 6, text: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Solution",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*em*/ ctx[6] === undefined && !('em' in props)) {
    			console.warn("<Solution> was created without expected prop 'em'");
    		}
    	}

    	get em() {
    		throw new Error("<Solution>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set em(value) {
    		throw new Error("<Solution>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get text() {
    		throw new Error("<Solution>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Solution>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.43.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let ol;
    	let li0;
    	let t5;
    	let li1;
    	let t7;
    	let li2;
    	let t9;
    	let li3;
    	let t11;
    	let button;
    	let t13;
    	let div;
    	let solution;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	solution = new Solution({ props: { em: true }, $$inline: true });

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Assignment";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Solve these tasks.";
    			t3 = space();
    			ol = element("ol");
    			li0 = element("li");
    			li0.textContent = "Add an input field that allows users to enter a course goal.";
    			t5 = space();
    			li1 = element("li");
    			li1.textContent = "Output the user input in a h1 tag.";
    			t7 = space();
    			li2 = element("li");
    			li2.textContent = "Color the output red (e.g. by adding a class) if it contains at least one exclamation mark.";
    			t9 = space();
    			li3 = element("li");
    			li3.textContent = "Put the h1 tag + output into a separate component to which you pass the user input";
    			t11 = space();
    			button = element("button");
    			button.textContent = "Solution";
    			t13 = space();
    			div = element("div");
    			create_component(solution.$$.fragment);
    			add_location(h1, file, 21, 0, 267);
    			add_location(p, file, 23, 0, 288);
    			add_location(li0, file, 26, 2, 322);
    			add_location(li1, file, 27, 2, 394);
    			add_location(li2, file, 28, 2, 440);
    			add_location(li3, file, 31, 2, 551);
    			add_location(ol, file, 25, 0, 315);
    			add_location(button, file, 36, 0, 658);
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(/*isVisible*/ ctx[0] === false ? 'invisible' : 'visible') + " svelte-wbi24b"));
    			add_location(div, file, 38, 0, 709);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, ol, anchor);
    			append_dev(ol, li0);
    			append_dev(ol, t5);
    			append_dev(ol, li1);
    			append_dev(ol, t7);
    			append_dev(ol, li2);
    			append_dev(ol, t9);
    			append_dev(ol, li3);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, button, anchor);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(solution, div, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*showSolution*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*isVisible*/ 1 && div_class_value !== (div_class_value = "" + (null_to_empty(/*isVisible*/ ctx[0] === false ? 'invisible' : 'visible') + " svelte-wbi24b"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(solution.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(solution.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(ol);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(div);
    			destroy_component(solution);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let isVisible = false;

    	function showSolution() {
    		$$invalidate(0, isVisible = true);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Solution, isVisible, showSolution });

    	$$self.$inject_state = $$props => {
    		if ('isVisible' in $$props) $$invalidate(0, isVisible = $$props.isVisible);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [isVisible, showSolution];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
