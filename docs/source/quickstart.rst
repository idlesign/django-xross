Quickstart
==========


**xross** requires a few steps to serve you well.


.. warning::

    Do not forget to add the **xross** application to INSTALLED_APPS in your settings file (usually 'settings.py').


Somewhere in your `views.py`:

.. code-block:: python

    from django.shortcuts import render
    from xross.toolbox import xross_view, xross_listener  # That's all we need from xross.


    def get_quote(request, vysotsky_only=False):
        """This function (operation in terms of xross) will be used by xross to get a random quote using AJAX.
        Note that this function could be used as an ordinary view also.

        """
        if vysotsky_only:
            quote = ...  # Some random quote by Vladimir Vysotsky.
        else:
            quote = ...  # Some random quote by any author.
        return render(request, 'mytemplates/sub_quote.html', {'quote': quote})


    def list_news(request):
        """This function (operation in terms of xross) will be used by xross to load news using AJAX.
        Note that this function could be used as an ordinary view too.

        """
        news = ...  # Here we fetch some news from DB.
        return render(request, 'mytemplates/sub_news.html', {'news': news})


    @xross_view(get_quote, list_news)  # Decorate your view - instruct xross to use `get_quote` and `list_news` when needed.
    def index_page(request):
        """This is our view to streamline."""

        xross_listener()  # xross will handle AJAX calls from that moment.

        return render(request, 'mytemplates/index.html')



Now to your `mytemplates/index.html`. Here we work with **xross** in quite a declarative way:

.. code-block:: html

    <!DOCTYPE html>
    <html>
    <head>
        <!-- xross depends on jQuery. Include it. -->
        <script src="http://yandex.st/jquery/2.1.1/jquery.min.js"></script>

        <!-- Now xross itself. -->
        <script src="{{ STATIC_URL }}js/xross/xross.js"></script>
        <script type="text/javascript">
            xross.automate();  // Instruct xross to watch for page elements with `xross` class.
        </script>
    </head>
    <body>
        <div id="list_news" class="xross">
            <!--
                Contents of this div will be replaced with news from Django's `list_news()`
                automatically on page load.
                That's the default of xross, but it knows some other nice little tricks.
                Watch for one of those below.
             -->
        </div>

        <!--
            Now let's put here a button which adds a random quote (using `get_quote()`)
            into `quotes_here` div below when clicked.

            Notice that we use some `data-x` attributes to program desired xross behaviour (`x` prefix stands for `xross`):

                1. data-xvysotsky_only="true" - True will be passed into `vysotsky_only` keyword argument of `get_quotes()`;

                2. data-xtarget="quotes_here" - Defines a target html element (here a div with id `quotes_here`) to place quote into;

                3. data-xsuccess="append" - Defines an action to be performed by xross upon a target element.
                   In this example we `append` a quote to `quotes_here`.

        -->
        <button id="get_quote" data-xvysotsky_only="true" data-xtarget="quotes_here" data-xsuccess="append">Get a quote ...</button>

        <div id="quotes_here">
            <!--
                Click the above button and a quote by Vladimir Vysotsky will be placed here.
            -->
        </div>

    </body>
    </html>



And two very simple templates:

`mytemplates/sub_news.html`:

.. code-block:: html

    {% for item in news %}
        <div>
            <div>{{ item.title }}</div>
            <div>{{ item.text }}</div>
        </div>
    {% endfor %}


`mytemplates/sub_quote.html`:

.. code-block:: html

    <div>
        <blockquote>{{ quote.text }}</blockquote>
        <div><i>by {{ quote.author }}</i></div>
    </div>
