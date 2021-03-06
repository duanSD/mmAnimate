// mmAnimate 2.0 2014.11.25
/**
 * @cnName 动画引擎
 * @enName mmAnimate
 * @introduce
 * <p>mmAnimate 基于CSS3 keyframe的实现</p>
 * <h3>使用方法</h3>
 * ```javascript
 avalon(elem).animate( properties [, duration] [, easing] [, complete] )
 avalon(elem).animate( properties, options )
 * ```
 * 同时支持动态keyframe与静态keyframe
 
 动态keyframe就是类似于jQuery的animate, show, hide, toggle, fadeIn, fadeOut等方法 它们只现定了最后要变成怎么样(最后一帧), 需要框架实时计算当前的样式(第一帧), 从而实现补间动画
 不过在mmAnimate.modern里，这个补间动画是使用css3 keyframe实现
 
 静态keyframe就是它的第一帧与最后一帧是规定好的，直接用animate.css定义好看的类名
 */
define(["avalon"], function() {
    /*********************************************************************
     *                      主函数                                   *
     **********************************************************************/
    if (!(window.MozCSSKeyframeRule || window.WebKitCSSKeyframeRule || window.CSSKeyframeRule)) {
        avalon.error("当前浏览器不支持CSS3 keyframe动画")
    }
    //http://stackoverflow.com/questions/6221411/any-perspectives-on-height-auto-for-css3-transitions-and-animations
    //http://www.cnblogs.com/rubylouvre/archive/2009/09/04/1559557.html
    var effect = avalon.fn.animate = function(properties, options) {
        var frame = new Frame(this[0])
        if (typeof properties === "number") { //如果第一个为数字
            frame.duration = properties
            if (arguments.length === 1) {
                frame.playState = false
            }
        } else if (typeof properties === "object") {
            for (var name in properties) {//处理第一个参数
                var p = avalon.cssName(name) || name
                if (name !== p) {
                    properties[p] = properties[name] //转换为驼峰风格borderTopWidth, styleFloat
                    delete properties[name] //去掉连字符风格 border-top-width, float
                }
            }
            frame.props = properties
        }
        addOptions.apply(frame, arguments)//处理第二,第三...参数
        //将关键帧插入到时间轴中或插到已有的某一帧的子列队,等此帧完毕,让它再进入时间轴
        insertFrame(frame)
        return this
    }

    //分解用户的传参
    var rmobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    var rgingerbread = /Android 2\.3\.[3-7]/i
    var support3D = (function() {
        var prop = avalon.cssName("transform")
        var el = document.createElement('div')
        var root = document.documentElement
        el.style[prop] = 'translate3d(1px,1px,1px)';
        root.insertBefore(el, null);
        var val = getComputedStyle(el).getPropertyValue(prop);
        root.removeChild(el);
        return  null != val && val.length && 'none' != val;
    })();

    function addOptions(properties) {
        //如果第二参数是对象
        for (var i = 1; i < arguments.length; i++) {
            addOption(this, arguments[i])
        }
        this.queue = !!(this.queue == null || this.queue) //是否插入子列队
        this.easing = bezier[this.easing] ? this.easing : "ease"//缓动公式的名字
        this.count = (this.count === Infinity || isIndex(this.count)) ? this.count : 1
        this.gotoEnd = false//是否立即跑到最后一帧
        var duration = this.duration
        this.duration = typeof duration === "number" ? duration : /^\d+ms$/.test(duration) ? parseFloat(duration) :
                /^\d+s$/.test(duration) ? parseFloat(duration) * 1000 : 400 //动画时长
        var ua = navigator.userAgent
        //是否开启3D硬件加速
        this.use3D = support3D && this.use3D && (rmobile.test(ua) ? !rgingerbread(ua) : 1)
    }
    function isIndex(s) {//判定是非负整数，可以作为索引的
        return +s === s >>> 0;
    }
    function addOption(frame, p, name) {
        if (!name) {
            switch (avalon.type(p)) {
                case "object":
                    for (var i in p) {
                        addOption(frame, p[i], i)
                    }
                    break
                case "number":
                    frame.duration = p
                    break
                case "string":
                    if (p === "slow") {
                        frame.duration = 600
                    } else if (p === "fast") {
                        frame.duration = 200
                    } else {
                        frame.easing = p
                    }
                    break
                case "function"://绑定各种回调
                    frame.bind("complete", p)
                    break
            }
        } else {
            if (typeof p === "function") {
                frame.bind(name, p)
            } else {
                frame[name] = p
            }
        }
    }
    /*********************************************************************
     *                          缓动公式                              *
     **********************************************************************/

    var bezier = {
        "linear": [0.250, 0.250, 0.750, 0.750],
        "ease": [0.250, 0.100, 0.250, 1.000],
        "swing": [0.250, 0.100, 0.250, 1.000],
        "easeIn": [0.420, 0.000, 1.000, 1.000],
        "easeOut": [0.000, 0.000, 0.580, 1.000],
        "easeInOut": [0.420, 0.000, 0.580, 1.000],
        "easeInQuad": [0.550, 0.085, 0.680, 0.530],
        "easeInCubic": [0.550, 0.055, 0.675, 0.190],
        "easeInQuart": [0.895, 0.030, 0.685, 0.220],
        "easeInQuint": [0.755, 0.050, 0.855, 0.060],
        "easeInSine": [0.470, 0.000, 0.745, 0.715],
        "easeInExpo": [0.950, 0.050, 0.795, 0.035],
        "easeInCirc": [0.600, 0.040, 0.980, 0.335],
        "easeInBack": [0.600, -0.280, 0.735, 0.045],
        "easeOutQuad": [0.250, 0.460, 0.450, 0.940],
        "easeOutCubic": [0.215, 0.610, 0.355, 1.000],
        "easeOutQuart": [0.165, 0.840, 0.440, 1.000],
        "easeOutQuint": [0.230, 1.000, 0.320, 1.000],
        "easeOutSine": [0.390, 0.575, 0.565, 1.000],
        "easeOutExpo": [0.190, 1.000, 0.220, 1.000],
        "easeOutCirc": [0.075, 0.820, 0.165, 1.000],
        "easeOutBack": [0.175, 0.885, 0.320, 1.275],
        "easeInOutQuad": [0.455, 0.030, 0.515, 0.955],
        "easeInOutCubic": [0.645, 0.045, 0.355, 1.000],
        "easeInOutQuart": [0.770, 0.000, 0.175, 1.000],
        "easeInOutQuint": [0.860, 0.000, 0.070, 1.000],
        "easeInOutSine": [0.445, 0.050, 0.550, 0.950],
        "easeInOutExpo": [1.000, 0.000, 0.000, 1.000],
        "easeInOutCirc": [0.785, 0.135, 0.150, 0.860],
        "easeInOutBack": [0.680, -0.550, 0.265, 1.550],
        "custom": [0.000, 0.350, 0.500, 1.300],
        "random": [Math.random().toFixed(3),
            Math.random().toFixed(3),
            Math.random().toFixed(3),
            Math.random().toFixed(3)]
    }
    //缓动公式
    avalon.easing = {}
    avalon.each(bezier, function(key, value) {
        avalon.easing[key] = bezierToEasing([value[0], value[1]], [value[2], value[3]])
    })
    function bezierToEasing(p1, p2) {
        var A = [null, null], B = [null, null], C = [null, null],
                derivative = function(t, ax) {
                    C[ax] = 3 * p1[ax], B[ax] = 3 * (p2[ax] - p1[ax]) - C[ax], A[ax] = 1 - C[ax] - B[ax];
                    return t * (C[ax] + t * (B[ax] + t * A[ax]));
                },
                bezierXY = function(t) {
                    return C[0] + t * (2 * B[0] + 3 * A[0] * t);
                },
                parametric = function(t) {
                    var x = t, i = 0, z;
                    while (++i < 14) {
                        z = derivative(x, 0) - t;
                        if (Math.abs(z) < 1e-3)
                            break;
                        x -= z / bezierXY(x);
                    }
                    return x;
                };
        return function(t) {
            return derivative(parametric(t), 1);
        }
    }
    /*********************************************************************
     *                      定时器                                  *
     **********************************************************************/
    function AnimationTimer() {
        //不存在msRequestAnimationFrame，IE10与Chrome24直接用:requestAnimationFrame
        if (window.requestAnimationFrame) {
            return {
                start: requestAnimationFrame.bind(window),
                stop: cancelAnimationFrame.bind(window)
            }
            //Firefox11-没有实现cancelRequestAnimationFrame
            //并且mozRequestAnimationFrame与标准出入过大
        } else if (window.mozCancelRequestAnimationFrame && window.mozCancelAnimationFrame) {
            return {
                start: mozRequestAnimationFrame.bind(window),
                stop: mozCancelAnimationFrame.bind(window)
            }
        } else if (window.webkitRequestAnimationFrame && webkitRequestAnimationFrame(String)) {
            return {//修正某个特异的webKit版本下没有time参数
                start: webkitRequestAnimationFrame.bind(window),
                stop: (window.webkitCancelAnimationFrame || window.webkitCancelRequestAnimationFrame).bind(window)
            }
        } else {
            //当你使用此模块时,你就不需要兼容旧式IE
        }
    }
    var Timer = new AnimationTimer()
    var TimerID = null
    /*********************************************************************
     *                      时间轴                                    *
     **********************************************************************/
    /**
     * @other
     * <p>一个时间轴<code>avalon.timeline</code>中包含许多帧, 一帧里面有各种渐变动画, 渐变的轨迹是由缓动公式所规定</p>
     */
    var timeline = avalon.timeline = []
    function insertFrame(frame) { //插入关键帧
        if (frame.queue) { //如果插入到已有的某一帧的子列队
            var gotoQueue = 1
            for (var i = timeline.length, el; el = timeline[--i]; ) {
                if (el.elem === frame.elem) { //★★★第一步
                    el.troops.push(frame) //子列队
                    gotoQueue = 0
                    break
                }
            }
            if (gotoQueue) { //★★★第二步
                timeline.unshift(frame)
            }
        } else {//插入时间轴
            timeline.push(frame)
        }
        if (!TimerID) { //时间轴只要存在帧就会执行定时器
            TimerID = Timer.start(function raf() {
                if (TimerID) {
                    deleteFrame()
                    Timer.start(raf)
                }
            })
        }
    }

    function deleteFrame() {
        var i = timeline.length
        while (--i >= 0) {
            if (!timeline[i].paused) { //如果没有被暂停
                //如果返回false或元素不存在,就从时间轴中删掉此关键帧
                if (!(timeline[i].elem && enterFrame(timeline[i], i))) {
                    timeline.splice(i, 1)
                }
            }
        }
        if (timeline.length === 0) {
            //如果时间轴里面没有关键帧,那么停止定时器,节约性能
            Timer.stop(TimerID)
            TimerID = null
        }
    }

    function enterFrame(frame, index) {
        //驱动主列队的动画实例进行补间动画(update)，
        //并在动画结束后，从子列队选取下一个动画实例取替自身
        var now = +new Date
        if (!frame.startTime) { //第一帧
            if (frame.playState) {
                frame.fire("before")//动画开始前做些预操作
                //此方法是用于获取元素最初的显隐状态,让元素处于可动画状态(display不能为none)
                //处理overflow,绑定after回调
                frame.build()
                frame.addKeyframe()
            }
            frame.startTime = now
        } else { //中间自动生成的补间
            var per = (now - frame.startTime) / frame.duration
            var end = frame.gotoEnd || per >= 1 //gotoEnd可以被外面的stop方法操控,强制中止

            if (frame.playState) {
                for (var i = 0, tween; tween = frame.tweens[i++]; ) {
                    if (tween.scrollXY) {
                        tween.run(per, end)
                    }
                }
                frame.fire("step") //每执行一帧调用的回调
            }
            if (end || frame.count === 0) { //最后一帧
                frame.count--
                frame.fire("after") //动画结束后执行的一些收尾工作
                if (frame.count <= 0) {
                    frame.removeKeyframe()
                    frame.fire("complete") //执行用户回调
                    var neo = frame.troops.shift()
                    if (!neo) {
                        return false
                    } //如果存在排队的动画,让它继续
                    timeline[index] = neo
                    neo.troops = frame.troops
                } else {
                    frame.startTime = frame.gotoEnd = false
                    frame.frameName = ("fx" + Math.random()).replace(/0\./, "")
                    if (frame.revert) {  //如果设置了倒带
                        frame.revertTweens()
                    } else {
                        frame.createTweens(avalon.isHidden(frame.elem))
                    }
                }
            }
        }
        return true
    }

    /*********************************************************************
     *                                  工具函数                          *
     **********************************************************************/
    var root = document.documentElement
    avalon.isHidden = function(node) {
        return  node.sourceIndex === 0 || avalon.css(node, "display") === "none" || !avalon.contains(root, node)
    }

    function dasherize(target) {
        return target.replace(/([a-z\d])(A-Z)/g, "$1-$2").replace(/\_/g, "-").replace(/^[A-Z]/, function(a) {
            return "-" + a.toLowerCase()
        })
    }
    //http://css3playground.com/flip-card.php

    var prefixJS = avalon.cssName("animation").replace(/animation/i, "");
    var prefixCSS = prefixJS === "" ? "" : "-" + prefixJS.toLowerCase() + "-";

    var rformat = /\\?\#{([^{}]+)\}/gm
    function format(str, object) {
        var array = avalon.slice(arguments, 1);
        return str.replace(rformat, function(match, name) {
            if (match.charAt(0) === "\\")
                return match.slice(1)
            var index = Number(name)
            if (index >= 0)
                return array[index]
            if (object && object[name] !== void 0)
                return object[name]
            return ""
        })
    }

    var styleElement
    function eachCSSRule(ruleName, callback, keyframes) {
        if (!styleElement) {
            styleElement = document.getElementById("avalonStyle")
        }
        var prop = keyframes ? "name" : "selectorText";
        var name = keyframes ? "@keyframes " : "cssRule ";//调试用
        //动态插入一条样式规则
        var sheet = styleElement.sheet// styleElement.styleSheet;
        var cssRules = sheet.cssRules // sheet.rules;
        var pos = -1
        for (var i = 0, n = cssRules.length; i < n; i++) {
            var rule = cssRules[i];
            if (rule[prop] === ruleName) {
                pos = i
                break;
            }
        }
        //如果想插入一条样式规则,  sheet.insertRule(rule, cssRules.length)
        //如果想删除一条样式规则, sheet.deleteRule(i);
        callback.call(sheet, pos, n)
    }
    function insertKeyframe(ruleName, rule) {
        eachCSSRule(ruleName, function(pos, end) {
            if (pos === -1) {
                this.insertRule(rule, end)
            }
        }, true)
    }

    function deleteKeyframe(ruleName) {
        eachCSSRule(ruleName, function(pos) {
            if (pos !== -1) {
                this.deleteRule(pos)
            }
        }, true)
    }

    /*********************************************************************
     *                                  逐帧动画                            *
     **********************************************************************/
    function Frame(elem) {
        this.$events = {}
        this.elem = elem
        this.troops = []
        this.tweens = []
        this.orig = {}
        this.props = {}
        this.count = 1
        this.frameName = ("fx" + Math.random()).replace(/0\./, "")
        this.playState = true //是否能更新
    }
    var $playState = avalon.cssName("animation-play-state")

    Frame.prototype = {
        constructor: Frame,
        bind: function(type, fn, unshift) {
            var fns = this.$events[type] || (this.$events[type] = []);
            var method = unshift ? "unshift" : "push"
            fns[method](fn)
        },
        fire: function(type) {
            var args = Array.prototype.slice.call(arguments, 1)
            var fns = this.$events[type] || []
            for (var i = 0, fn; fn = fns[i++]; ) {
                fn.call(this.elem, args)
            }
        },
        play: function(stop) {
            this.elem.style[$playState] = stop ? "paused" : "running"
            this.paused = stop ? Date.now() : null
        },
        build: function() {
            var frame = this
            var elem = frame.elem
            var props = frame.props
            var style = elem.style
            //show 开始时计算其width1 height1 保存原来的width height display改为inline-block或block overflow处理 赋值（width1，height1）
            //hide 保存原来的width height 赋值为(0,0) overflow处理 结束时display改为none;
            //toggle 开始时判定其是否隐藏，使用再决定使用何种策略
            var hidden = avalon.isHidden(elem)
            if ("height" in props || "width" in props) {
                frame.overflow = [style.overflow, style.overflowX, style.overflowY]
            }
            var display = style.display || avalon.css(elem, "display")
            var oldDisplay = elem.getAttribute("olddisplay")
            if (!oldDisplay) {
                if (display === "none") {
                    style.display = ""//尝试清空行内的display
                    display = avalon.css(elem, "display")
                    if (display === "none") {
                        display = avalon.parseDisplay(elem.nodeName)
                    }
                }
                elem.setAttribute("olddisplay", display)
            } else {
                if (display !== "none") {
                    elem.setAttribute("olddisplay", display)
                } else {
                    display = oldDisplay
                }
            }
            style.display = display
            //修正内联元素的display为inline-block，以让其可以进行width/height的动画渐变
            if (display === "inline" && avalon.css(elem, "float") === "none") {
                style.display = "inline-block"
            }
            this.createTweens(hidden)
            if (frame.overflow) {
                style.overflow = "hidden"
                frame.bind("after", function() {
                    style.overflow = frame.overflow[ 0 ]
                    style.overflowX = frame.overflow[ 1 ]
                    style.overflowY = frame.overflow[ 2 ]
                })
            }

            frame.bind("after", function() {
                if (frame.showState === "hide") {
                    this.style.display = "none"
                    this.dataShow = {}
                    for (var i in frame.orig) { //还原为初始状态
                        this.dataShow[i] = frame.orig[i]
                        avalon.css(this, i, frame.orig[i])
                    }
                } else {
                    var elem = this
                    var inline = elem.style
                    var computed = window.getComputedStyle(elem, null);
                    frame.tweens.forEach(function(el) {
                        var name = el.name
                        if (name in inline) {//保留动画成果
                            inline[name] = computed[name]
                        }
                    })
                }
            })
            this.build = avalon.noop
        },
        removeKeyframe: function() {
            //删除一条@keyframes样式规则
            deleteKeyframe(this.frameName)
        },
        addKeyframe: function() {
            var from = []
            var to = []
            var set3D = false
            var frame = this
            this.tweens.forEach(function(el) {
                if (frame.use3D && /transform/i.test(el.name) && !set3D) {
                    set3D = true
                }
                from.push(dasherize(el.name) + ":" + el.start + el.unit)
                to.push(dasherize(el.name) + ":" + el.end + el.unit)
            })

            //CSSKeyframesRule的模板
            var anmationRule = "#{frameName} #{duration}ms cubic-bezier(#{easing}) 0s 1 normal #{model} running";
            var rule1 = format(frameRule, {
                frameName: this.frameName,
                prefix: prefixCSS,
                from: from.join(";"),
                to: to.join(";")
            })
            insertKeyframe(this.frameName, rule1)
            var rule2 = format(anmationRule, {
                frameName: this.frameName,
                duration: this.duration,
                model: "forwards", //(this.showState === "hide") ? "backwards" : "forwards",
                easing: bezier[this.easing]
            })
            var elem = this.elem
            elem.style[avalon.cssName("animation")] = rule2
            //http://aerotwist.com/blog/on-translate3d-and-layer-creation-hacks/
            if (this.use3D && !set3D) {
                elem.style[avalon.cssName("transform")] = "translate3d(0,0,0)"
            }
        },
        createTweens: function(hidden) {
            this.tweens = []
            for (var i in this.props) {
                createTweenImpl(this, i, this.props[i], hidden)
            }
        },
        revertTweens: function() {
            for (var i = 0, tween; tween = this.tweens[i++]; ) {
                var start = tween.start
                var end = tween.end
                tween.start = end
                tween.end = start
                this.props[tween.name] = (tween.unit ? tween.start + tween.unit : tween.start)
            }
        }
    }
    var rfxnum = new RegExp("^(?:([+-])=|)(" + (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source + ")([a-z%]*)$", "i")
    var frameRule = "@#{prefix}keyframes #{frameName}{ 0%{ #{from} } 100%{  #{to} }  }";

    function createTweenImpl(frame, name, value, hidden) {
        var elem = frame.elem
        var dataShow = elem.dataShow || {}
        var tween = new Tween(name, frame)
        var from = dataShow[name] || tween.cur() //取得起始值
        var to
        if (/color$/i.test(name)) {
            //用于分解属性包中的样式或属性,变成可以计算的因子
            parts = [from, value]
        } else {
            parts = rfxnum.exec(from)
            var unit = parts && parts[ 3 ] || (avalon.cssNumber[ name ] ? "" : "px")
            //处理 toggle, show, hide
            if (value === "toggle") {
                value = hidden ? "show" : "hide"
            }
            if (value === "show") {
                frame.showState = "show"
                avalon.css(elem, name, 0);
                parts = [0, parseFloat(from)]
            } else if (value === "hide") {
                frame.showState = "hide"
                frame.orig[name] = from
                parts = [parseFloat(from), 0]
                value = 0;
            } else {// "18em"  "+=18em"
                parts = rfxnum.exec(value)//["+=18em", "+=", "18", "em"]
                if (parts) {
                    parts[2] = parseFloat(parts[2]) //18
                    if (parts[3] && parts[ 3 ] !== unit) {//如果存在单位，并且与之前的不一样，需要转换
                        var clone = elem.cloneNode(true)
                        clone.style.visibility = "hidden"
                        clone.style.position = "absolute"
                        elem.parentNode.appendChild(clone)
                        avalon.css(clone, name, parts[2] + (parts[3] ? parts[3] : 0))
                        parts[ 2 ] = parseFloat(avalon.css(clone, name))
                        elem.parentNode.removeChild(clone)
                    }
                    to = parts[2]
                    from = parseFloat(from)
                    if (parts[ 1 ]) {
                        to = from + (parts[ 1 ] + 1) * parts[ 2 ]
                    }
                    parts = [from, to]
                }
            }
        }
        from = parts[0]
        to = parts[1]
        if (from + "" !== to + "") { //不处理起止值都一样的样式与属性
            tween.start = from
            tween.end = to
            tween.unit = unit || ""
            frame.tweens.push(tween)
        } else {
            delete frame.props[name]
        }
    }
    function Tween(prop, options) {
        this.elem = options.elem
        this.name = prop
        this.easing = avalon.easing[options.easing]
        this.scrollXY = prop === "scrollTop" || prop === "scrollLeft"
    }

    Tween.prototype = {
        constructor: Tween,
        cur: function() {//取得当前值
            var hook = Tween.propHooks[ this.name ]
            return hook && hook.get ?
                    hook.get(this) :
                    Tween.propHooks._default.get(this)
        },
        run: function(per, end) {//更新元素的某一样式或属性
            this.update(per, end)
            var hook = Tween.propHooks[ this.name ]
            if (hook && hook.set) {
                hook.set(this)
            } else {
                Tween.propHooks._default.set(this)
            }
        },
        update: function(per, end) {
            this.now = (end ? this.end : this.start + this.easing(per) * (this.end - this.start))
        }
    }

    Tween.propHooks = {
        //只处理scrollTop, scrollLeft
        _default: {
            get: function(tween) {
                var result = avalon.css(tween.elem, tween.name)
                return !result || result === "auto" ? 0 : result
            },
            set: function(tween) {
                avalon.css(tween.elem, tween.name, tween.now + tween.unit)
            }
        }
    }
    ;
    ["scrollTop", "scrollLeft"].forEach(function(name) {
        Tween.propHooks[name] = {
            get: function(tween) {
                return tween.elem[tween.name]
            },
            set: function(tween) {
                tween.elem[tween.name] = tween.now
            }
        }
    })

    /*********************************************************************
     *                                  原型方法                            *
     **********************************************************************/

    avalon.fn.mix({
        delay: function(ms) {
            return this.animate(ms)
        },
        pause: function() {
            var cur = this[0]
            for (var i = 0, frame; frame = timeline[i]; i++) {
                if (frame.elem === cur) {
                    frame.play("stop")
                }
            }
            return this
        },
        resume: function() {
            var now = new Date
            var elem = this[0]
            for (var i = 0, frame; frame = timeline[i]; i++) {
                if (frame.elem === elem) {
                    frame.startTime += (now - frame.paused)
                    frame.play()
                }
            }
            return this
        },
        //如果clearQueue为true，是否清空列队
        //如果gotoEnd 为true，是否跳到此动画最后一帧
        stop: function(clearQueue, gotoEnd) {
            clearQueue = clearQueue ? "1" : ""
            gotoEnd = gotoEnd ? "1" : "0"
            var stopCode = parseInt(clearQueue + gotoEnd, 2) //返回0 1 2 3
            var node = this[0]
            for (var i = 0, frame; frame = timeline[i]; i++) {
                if (frame.elem === node) {
                    frame.gotoEnd = true
                    frame.count = 0
                    switch (stopCode) { //如果此时调用了stop方法
                        case 0:
                            // false false 中断当前动画，继续下一个动画
                            frame.playState = frame.revert = false
                            break
                        case 1:
                            // false true立即跳到最后一帧，继续下一个动画
                            frame.revert = false
                            break
                        case 2:
                            // true false清空该元素的所有动画
                            delete frame.elem
                            break
                        case 3:
                            // true true 立即完成该元素的所有动画
                            frame.troops.forEach(function(a) {
                                a.gotoEnd = true
                            })
                            break
                    }
                }
            }
            return this
        }
    })
    /*********************************************************************
     *                                 常用特效                            *
     **********************************************************************/
    var fxAttrs = [
        ["height", "marginTop", "marginBottom", "borderTopWidth", "borderBottomWidth", "paddingTop", "paddingBottom"],
        ["width", "marginLeft", "marginRight", "borderLeftWidth", "borderRightWidth", "paddingLeft", "paddingRight"],
        ["opacity"]
    ]
    function genFx(type, num) { //生成属性包
        var obj = {}
        fxAttrs.concat.apply([], fxAttrs.slice(0, num)).forEach(function(name) {
            obj[name] = type
        })
        return obj
    }


    var effects = {
        slideDown: genFx("show", 1),
        slideUp: genFx("hide", 1),
        slideToggle: genFx("toggle", 1),
        fadeIn: {
            opacity: "show"
        },
        fadeOut: {
            opacity: "hide"
        },
        fadeToggle: {
            opacity: "toggle"
        }
    }

    avalon.each(effects, function(method, props) {
        avalon.fn[method] = function() {
            var args = [].concat.apply([props], arguments)
            return this.animate.apply(this, args)
        }
    })

    String("toggle,show,hide").replace(avalon.rword, function(name) {
        avalon.fn[name] = function() {
            var args = [].concat.apply([genFx(name, 3)], arguments)
            return this.animate.apply(this, args)
        }
    })
    return avalon
})