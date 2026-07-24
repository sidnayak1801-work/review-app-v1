!function(){
  function escapeHtml(value){
    return String(value||"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function formatDate(value){
    if(!value) return "";
    var date=new Date(value);
    if(isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
  }

  function renderCard(item){
    var date=formatDate(item.answeredAt||item.publishedAt||item.createdAt);
    var answer=item.answer
      ? '<div class="vouch-qa__answer"><span class="vouch-qa__answer-label">Store answer</span><p class="vouch-qa__answer-body">'+escapeHtml(item.answer)+"</p></div>"
      : "";
    return '<article class="vouch-qa__card"><div class="vouch-qa__meta"><span class="vouch-qa__author">'+escapeHtml(item.customerName||"Customer")+"</span>"+(date?'<span>'+escapeHtml(date)+"</span>":"")+'</div><p class="vouch-qa__question">'+escapeHtml(item.question)+"</p>"+answer+"</article>";
  }

  function fetchQa(proxyUrl, productId, limit, cursor){
    var url=proxyUrl+"?productId="+encodeURIComponent(productId)+"&limit="+limit;
    if(cursor) url+="&cursor="+encodeURIComponent(cursor);
    return fetch(url,{headers:{Accept:"application/json"},credentials:"same-origin"})
      .then(function(response){
        if(!response.ok) throw new Error("fail");
        return response.json();
      });
  }

  function init(root){
    var productId=root.getAttribute("data-product-id");
    var productTitle=root.getAttribute("data-product-title")||"";
    var proxyUrl=root.getAttribute("data-proxy-url")||"/apps/reviews/qa";
    var pageSize=Number(root.getAttribute("data-page-size"))||3;
    var showForm="false"!==root.getAttribute("data-show-form");
    var listEl=root.querySelector("[data-vouch-qa-list]");
    var moreBtn=root.querySelector("[data-vouch-qa-more]");
    var openBtn=root.querySelector("[data-vouch-qa-open]");
    var modal=root.querySelector("[data-vouch-qa-modal]");
    var form=root.querySelector("[data-vouch-qa-form]");
    var errorEl=root.querySelector("[data-vouch-qa-error]");
    var submitBtn=root.querySelector("[data-vouch-qa-submit]");
    var nextCursor=null;
    var items=[];
    var submitting=false;

    function setError(message){
      if(!errorEl) return;
      errorEl.hidden=!message;
      errorEl.textContent=message||"";
    }

    function closeModal(){
      if(!modal) return;
      modal.hidden=true;
      document.documentElement.style.overflow="";
    }

    function openModal(){
      if(!modal||!showForm) return;
      if(form) form.reset();
      setError("");
      modal.hidden=false;
      document.documentElement.style.overflow="hidden";
    }

    function render(appendItems){
      if(!items.length){
        listEl.innerHTML='<p class="vouch-qa__empty">No questions yet. Be the first to ask.</p>';
      } else if(appendItems&&appendItems.length){
        var empty=listEl.querySelector(".vouch-qa__empty");
        if(empty) empty.remove();
        listEl.insertAdjacentHTML("beforeend", appendItems.map(renderCard).join(""));
      } else {
        listEl.innerHTML=items.map(renderCard).join("");
      }
      if(moreBtn) moreBtn.hidden=!nextCursor;
    }

    function load(reset){
      if(moreBtn){
        moreBtn.disabled=true;
        moreBtn.textContent="Loading…";
      }
      return fetchQa(proxyUrl, productId, pageSize, reset?null:nextCursor)
        .then(function(payload){
          var page=payload.items||[];
          var pageInfo=payload.pageInfo||{};
          nextCursor=pageInfo.hasNextPage?pageInfo.nextCursor:null;
          if(reset){
            items=page;
            render(null);
          } else {
            items=items.concat(page);
            render(page);
          }
        })
        .catch(function(){
          if(reset) listEl.textContent="Questions unavailable.";
        })
        .then(function(){
          if(moreBtn){
            moreBtn.disabled=false;
            moreBtn.textContent="Show more questions";
            moreBtn.hidden=!nextCursor;
          }
        });
    }

    if(!productId||!listEl) return;

    if(openBtn){
      openBtn.hidden=!showForm;
      openBtn.addEventListener("click", openModal);
    }
    root.querySelectorAll("[data-vouch-qa-close]").forEach(function(el){
      el.addEventListener("click", closeModal);
    });
    if(moreBtn){
      moreBtn.addEventListener("click", function(){
        if(nextCursor) load(false);
      });
    }
    if(form){
      form.addEventListener("submit", function(event){
        event.preventDefault();
        if(submitting) return;
        var data=new FormData(form);
        data.set("shopifyProductId", productId);
        if(productTitle) data.set("productTitle", productTitle);
        submitting=true;
        if(submitBtn){
          submitBtn.disabled=true;
          submitBtn.textContent="Submitting…";
        }
        setError("");
        fetch(proxyUrl,{method:"POST",body:data,credentials:"same-origin"})
          .then(function(response){
            return response.json().then(function(body){
              return {ok:response.ok, body:body};
            });
          })
          .then(function(result){
            if(result.ok){
              closeModal();
              listEl.insertAdjacentHTML(
                "afterbegin",
                '<p class="vouch-qa__empty">Thanks! Your question was submitted and will appear after review.</p>'
              );
            } else {
              setError((result.body&&result.body.error&&result.body.error.message)||"Unable to submit question.");
            }
          })
          .catch(function(){
            setError("Unable to submit question.");
          })
          .then(function(){
            submitting=false;
            if(submitBtn){
              submitBtn.disabled=false;
              submitBtn.textContent="Submit question";
            }
          });
      });
    }

    document.addEventListener("keydown", function(event){
      if(event.key==="Escape"&&modal&&!modal.hidden) closeModal();
    });

    load(true);
  }

  document.addEventListener("DOMContentLoaded", function(){
    document.querySelectorAll("[data-vouch-qa]").forEach(init);
  });
}();
